import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Friendship, FriendshipDocument } from '../friends/schemas/friendship.schema';
import { FriendMessage, FriendMessageDocument } from './schemas/friend-message.schema';
import {
  FriendChatReport,
  FriendChatReportDocument,
  REPORT_REASON_LABELS,
  ReportReason,
} from './schemas/friend-chat-report.schema';
import { UsersService, chatBanMessage, effectiveDisplayName } from '../users/users.service';
import { PushService } from '../push/push.service';
import { PresenceService } from '../presence/presence.service';
import { MailService } from '../mail/mail.service';
import type { AdminSendMailDto } from '../mail/dto/admin-send-mail.dto';

const MAX_MESSAGES = 300; // 대화마다 이 개수를 넘으면 오래된 메시지부터 지운다
const INITIAL_FETCH_LIMIT = 50;
const SEND_COOLDOWN_MS = 1000; // 유저 1명 기준 도배 방지
const PUSH_PREVIEW_LENGTH = 80;
const REPORT_DAILY_LIMIT = 20; // 신고 남용 방지: 한 유저가 하루에 할 수 있는 신고 수
const REPORT_CONTEXT_BEFORE = 5;
const REPORT_CONTEXT_AFTER = 3;
const REPORT_LIST_LIMIT = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const BAN_NOTICE_TITLE = '채팅 이용 정지 안내';

export interface FriendMessageView {
  id: string;
  userId: string; // 보낸 사람
  text: string; // 삭제된 메시지는 빈 문자열
  createdAt: number;
  deleted: boolean;
}

// 대화를 가져오는 응답. 폴링마다 "지금 상태"를 함께 내려서 읽음·삭제·접속 표시가 항상 최신으로 맞게 한다.
export interface FriendChatPoll {
  messages: FriendMessageView[]; // after 이후(또는 최근) 메시지
  friendUnreadIds: string[]; // 내가 보낸 메시지 중 상대가 아직 안 읽은 것(여기에 없으면 읽은 것)
  deletedIds: string[]; // 이 대화에서 삭제된 모든 메시지(이미 화면에 있는 메시지도 삭제 표시를 반영하려고)
  friendOnline: boolean;
}

export interface FriendChatUnread {
  total: number;
  byFriend: Record<string, number>;
}

export const conversationKeyOf = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

type LeanMessage = {
  _id: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  text: string;
  createdAt: number;
  readAt?: number | null;
  deletedAt?: number | null;
};

@Injectable()
export class FriendChatService {
  private readonly logger = new Logger(FriendChatService.name);
  // 유저별 마지막 전송 시각. 재시작하면 초기화돼도 괜찮은 가벼운 도배 방지용이라 메모리에만 둔다.
  private readonly lastSentAt = new Map<string, number>();

  // 앞의 두 개 뒤로는 부가 기능용 의존성이다(없으면 그 기능만 꺼진다). 기존 테스트의 생성자 호출이 깨지지 않게 뒤에 둔다.
  constructor(
    @InjectModel(FriendMessage.name)
    private messageModel: Model<FriendMessageDocument>,
    @InjectModel(Friendship.name)
    private friendshipModel: Model<FriendshipDocument>,
    @InjectModel(FriendChatReport.name)
    private reportModel: Model<FriendChatReportDocument>,
    private readonly usersService: UsersService,
    private readonly pushService: PushService,
    private readonly presenceService: PresenceService,
    // 채팅 정지를 걸 때 안내 우편을 보내는 데 쓴다(없으면 안내 없이 정지만 건다).
    private readonly mailService?: MailService,
  ) {}

  // 서로 친구(수락된 관계)일 때만 대화할 수 있다. 친구를 끊으면 이 검사에서 바로 막힌다.
  private async assertFriends(userId: string, friendId: string) {
    if (userId === friendId) {
      throw new BadRequestException('자기 자신에게는 메시지를 보낼 수 없어요.');
    }
    const me = new Types.ObjectId(userId);
    const friend = new Types.ObjectId(friendId);
    const found = await this.friendshipModel.exists({
      status: 'accepted',
      $or: [
        { requesterId: me, recipientId: friend },
        { requesterId: friend, recipientId: me },
      ],
    });
    if (!found) {
      throw new ForbiddenException('친구와만 대화할 수 있어요.');
    }
  }

  private toView(doc: LeanMessage): FriendMessageView {
    const deleted = !!doc.deletedAt;
    return {
      id: doc._id.toString(),
      userId: doc.senderId.toString(),
      text: deleted ? '' : doc.text,
      createdAt: doc.createdAt,
      deleted,
    };
  }

  // 대화 내용을 가져온다. 상대가 보낸 메시지 중 이번에 돌려주는 것만 "읽음"으로 바꾼다
  // (화면에 안 보낸 오래된 메시지까지 읽음 처리되지 않도록).
  async getMessages(userId: string, friendId: string, after?: string): Promise<FriendChatPoll> {
    await this.assertFriends(userId, friendId);
    const key = conversationKeyOf(userId, friendId);
    const docs = await this.messageModel
      .find({ conversationKey: key, ...(after ? { _id: { $gt: new Types.ObjectId(after) } } : {}) })
      .sort({ _id: after ? 1 : -1 })
      .limit(after ? MAX_MESSAGES : INITIAL_FETCH_LIMIT)
      .lean<LeanMessage[]>();
    const ordered = after ? docs : docs.reverse();

    const incomingUnread = ordered
      .filter((d) => d.senderId.toString() === friendId && (d.readAt ?? null) === null && !d.deletedAt)
      .map((d) => d._id);
    if (incomingUnread.length > 0) {
      await this.messageModel.updateMany(
        { _id: { $in: incomingUnread }, readAt: null },
        { $set: { readAt: Date.now() } },
      );
    }

    const [unreadMine, deleted] = await Promise.all([
      this.messageModel
        .find({ conversationKey: key, senderId: new Types.ObjectId(userId), readAt: null, deletedAt: null }, { _id: 1 })
        .lean(),
      this.messageModel.find({ conversationKey: key, deletedAt: { $ne: null } }, { _id: 1 }).lean(),
    ]);
    return {
      messages: ordered.map((d) => this.toView(d)),
      friendUnreadIds: unreadMine.map((d) => d._id.toString()),
      deletedIds: deleted.map((d) => d._id.toString()),
      friendOnline: this.presenceService ? this.presenceService.isOnline(friendId) : false,
    };
  }

  async sendMessage(userId: string, friendId: string, text: string): Promise<FriendMessageView> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('메시지를 입력해 주세요.');
    }
    // 신고 처리로 채팅이 정지된 유저는 보낼 수 없다(읽기는 가능).
    const ban = await this.usersService?.getChatBan(userId);
    if (ban) {
      throw new ForbiddenException(chatBanMessage(ban.until));
    }
    await this.assertFriends(userId, friendId);

    const now = Date.now();
    const last = this.lastSentAt.get(userId) || 0;
    if (now - last < SEND_COOLDOWN_MS) {
      throw new BadRequestException('너무 빨리 보내고 있어요. 잠시만요.');
    }
    this.lastSentAt.set(userId, now);

    const key = conversationKeyOf(userId, friendId);
    const doc = await this.messageModel.create({
      conversationKey: key,
      senderId: new Types.ObjectId(userId),
      recipientId: new Types.ObjectId(friendId),
      text: trimmed,
      createdAt: now,
      readAt: null,
      deletedAt: null,
    });
    await this.trimOldMessages(key);
    // 푸시는 기다리지 않는다(실패해도 메시지 전송에는 영향이 없다).
    void this.notifyRecipient(userId, friendId, trimmed);
    return this.toView(doc);
  }

  // 받는 친구의 기기로 푸시 알림을 보낸다. 같은 친구가 연달아 보내면 알림이 서로 대체된다(tag).
  async notifyRecipient(senderId: string, recipientId: string, text: string): Promise<void> {
    if (!this.pushService || !this.usersService) return;
    try {
      const sender = await this.usersService.findById(senderId);
      const name = sender ? effectiveDisplayName(sender) : '친구';
      const body = text.length > PUSH_PREVIEW_LENGTH ? `${text.slice(0, PUSH_PREVIEW_LENGTH)}…` : text;
      await this.pushService.sendToUser(recipientId, { title: name, body, view: 'friends', tag: `dm-${senderId}` }, 'friendChat');
    } catch (e) {
      this.logger.warn(`친구 메시지 푸시 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 내가 보낸 메시지를 삭제한다. 상대 화면에서도 "삭제된 메시지"로 바뀐다.
  async deleteMessage(userId: string, friendId: string, messageId: string) {
    await this.assertFriends(userId, friendId);
    const _id = new Types.ObjectId(messageId);
    const key = conversationKeyOf(userId, friendId);
    const updated = await this.messageModel.findOneAndUpdate(
      { _id, conversationKey: key, senderId: new Types.ObjectId(userId), deletedAt: null },
      { $set: { deletedAt: Date.now(), text: '' } },
      { returnDocument: 'after' },
    );
    if (!updated) {
      const existing = await this.messageModel.findOne({ _id, conversationKey: key }, { senderId: 1 }).lean();
      if (!existing) throw new NotFoundException('메시지를 찾을 수 없어요.');
      if (existing.senderId.toString() !== userId) {
        throw new ForbiddenException('내가 보낸 메시지만 삭제할 수 있어요.');
      }
      throw new BadRequestException('이미 삭제된 메시지예요.');
    }
    return { id: messageId };
  }

  private async trimOldMessages(key: string) {
    const count = await this.messageModel.countDocuments({ conversationKey: key });
    const excess = count - MAX_MESSAGES;
    if (excess <= 0) return;
    const oldest = await this.messageModel
      .find({ conversationKey: key }, { _id: 1 })
      .sort({ _id: 1 })
      .limit(excess)
      .lean();
    await this.messageModel.deleteMany({ _id: { $in: oldest.map((d) => d._id) } });
  }

  // 안 읽은 메시지 수. 현재 친구인 사람이 보낸 것만 센다(친구를 끊은 사람의 메시지는 보이지 않으므로). 삭제된 메시지는 세지 않는다.
  async getUnread(userId: string): Promise<FriendChatUnread> {
    const me = new Types.ObjectId(userId);
    const [rows, friendships] = await Promise.all([
      this.messageModel.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { recipientId: me, readAt: null, deletedAt: null } },
        { $group: { _id: '$senderId', count: { $sum: 1 } } },
      ]),
      this.friendshipModel
        .find({ status: 'accepted', $or: [{ requesterId: me }, { recipientId: me }] }, { requesterId: 1, recipientId: 1 })
        .lean(),
    ]);
    const friendIds = new Set(
      friendships.map((f) => (f.requesterId.toString() === userId ? f.recipientId.toString() : f.requesterId.toString())),
    );
    const byFriend: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      const id = r._id.toString();
      if (!friendIds.has(id)) continue;
      byFriend[id] = r.count;
      total += r.count;
    }
    return { total, byFriend };
  }

  // ---------- 신고 ----------

  // 상대가 보낸 메시지를 신고한다. 신고한 순간의 내용과 앞뒤 대화를 복사해 둔다.
  async reportMessage(userId: string, messageId: string, reason: string, detail?: string) {
    const _id = new Types.ObjectId(messageId);
    const me = new Types.ObjectId(userId);
    const message = await this.messageModel.findOne({ _id }).lean<LeanMessage & { conversationKey: string }>();
    // 내가 주고받은 대화의 메시지만 신고할 수 있다(남의 대화 메시지 id를 알아도 신고할 수 없다).
    if (!message || (message.senderId.toString() !== userId && message.recipientId.toString() !== userId)) {
      throw new NotFoundException('메시지를 찾을 수 없어요.');
    }
    if (message.senderId.toString() === userId) {
      throw new BadRequestException('내가 보낸 메시지는 신고할 수 없어요.');
    }
    if (message.deletedAt) {
      throw new BadRequestException('삭제된 메시지는 신고할 수 없어요.');
    }
    if (await this.reportModel.exists({ reporterId: me, messageId: _id })) {
      throw new BadRequestException('이미 신고한 메시지예요.');
    }
    const recent = await this.reportModel.countDocuments({ reporterId: me, createdAt: { $gt: Date.now() - DAY_MS } });
    if (recent >= REPORT_DAILY_LIMIT) {
      throw new BadRequestException('오늘은 더 이상 신고할 수 없어요. 내일 다시 시도해 주세요.');
    }

    const key = message.conversationKey;
    const [before, after] = await Promise.all([
      this.messageModel
        .find({ conversationKey: key, _id: { $lt: _id }, deletedAt: null })
        .sort({ _id: -1 })
        .limit(REPORT_CONTEXT_BEFORE)
        .lean<LeanMessage[]>(),
      this.messageModel
        .find({ conversationKey: key, _id: { $gt: _id }, deletedAt: null })
        .sort({ _id: 1 })
        .limit(REPORT_CONTEXT_AFTER)
        .lean<LeanMessage[]>(),
    ]);
    const context = [...before.reverse(), message, ...after].map((m) => ({
      messageId: m._id,
      senderId: m.senderId,
      text: m.text,
      createdAt: m.createdAt,
    }));

    try {
      await this.reportModel.create({
        reporterId: me,
        reportedUserId: message.senderId,
        messageId: _id,
        conversationKey: key,
        messageText: message.text,
        context,
        reason: reason as ReportReason,
        detail: (detail ?? '').trim(),
        status: 'open',
        createdAt: Date.now(),
      });
    } catch (e) {
      // 동시에 두 번 눌렀을 때 유니크 인덱스가 막아준다.
      if ((e as { code?: number }).code === 11000) {
        throw new BadRequestException('이미 신고한 메시지예요.');
      }
      throw e;
    }
    this.logger.log(`친구 채팅 신고 접수: reporter=${userId} reported=${message.senderId.toString()} reason=${reason}`);
    return { message: '신고가 접수됐어요. 운영자가 확인할게요.' };
  }

  // ---------- 관리자: 신고 처리 ----------

  async listReports(status: 'open' | 'handled' | 'all' = 'open') {
    const filter: { status?: 'open' | { $ne: 'open' } } =
      status === 'open' ? { status: 'open' } : status === 'handled' ? { status: { $ne: 'open' } } : {};
    const [reports, openCount] = await Promise.all([
      this.reportModel.find(filter).sort({ createdAt: -1 }).limit(REPORT_LIST_LIMIT).lean(),
      this.reportModel.countDocuments({ status: 'open' }),
    ]);

    const userIds = new Set<string>();
    for (const r of reports) {
      userIds.add(r.reporterId.toString());
      userIds.add(r.reportedUserId.toString());
    }
    const users = userIds.size ? await this.usersService.findByIds([...userIds]) : [];
    const nameOf = new Map(users.map((u) => [u._id.toString(), effectiveDisplayName(u)]));
    const now = Date.now();
    // 신고당한 사람이 지금 채팅 정지 중이면 풀리는 시각(처리 화면에서 중복 정지를 피하게 보여준다)
    const banUntilOf = new Map(
      users.filter((u) => (u.chatBannedUntil ?? 0) > now).map((u) => [u._id.toString(), u.chatBannedUntil as number]),
    );
    const label = (id: Types.ObjectId) => nameOf.get(id.toString()) ?? '알 수 없음';

    // 신고당한 사람이 지금까지 몇 명에게 신고당했는지(서로 다른 신고자 수). 반복되는 사람을 가려내는 데 쓴다.
    const reportedIds = [...new Set(reports.map((r) => r.reportedUserId.toString()))].map((id) => new Types.ObjectId(id));
    const counts = reportedIds.length
      ? await this.reportModel.aggregate<{ _id: Types.ObjectId; reporters: number }>([
          { $match: { reportedUserId: { $in: reportedIds } } },
          { $group: { _id: { reported: '$reportedUserId', reporter: '$reporterId' } } },
          { $group: { _id: '$_id.reported', reporters: { $sum: 1 } } },
        ])
      : [];
    const reporterCount = new Map(counts.map((c) => [c._id.toString(), c.reporters]));

    return {
      openCount,
      reports: reports.map((r) => ({
        id: r._id.toString(),
        reporter: { userId: r.reporterId.toString(), displayName: label(r.reporterId) },
        reported: { userId: r.reportedUserId.toString(), displayName: label(r.reportedUserId) },
        reportedReporterCount: reporterCount.get(r.reportedUserId.toString()) ?? 1,
        reportedBanUntil: banUntilOf.get(r.reportedUserId.toString()) ?? null,
        sanction: r.sanctionDays ? { days: r.sanctionDays, until: r.sanctionUntil ?? 0 } : null,
        reason: r.reason,
        reasonLabel: REPORT_REASON_LABELS[r.reason] ?? r.reason,
        detail: r.detail,
        messageText: r.messageText,
        messageId: r.messageId.toString(),
        context: r.context.map((m) => ({
          messageId: m.messageId.toString(),
          sender: m.senderId.toString() === r.reportedUserId.toString() ? 'reported' : 'reporter',
          text: m.text,
          createdAt: m.createdAt,
        })),
        status: r.status,
        adminNote: r.adminNote,
        handledAt: r.handledAt,
        createdAt: r.createdAt,
      })),
    };
  }

  // 신고를 처리한다. 처리 완료(resolved)일 때는 banDays일 동안의 채팅 정지를 함께 걸 수 있다.
  // 정지는 신고당한 유저의 친구 채팅과 공동 채팅방 전송을 막는다(읽기는 가능). 이미 더 긴 정지가 걸려 있으면 그대로 둔다.
  async resolveReport(
    adminId: string,
    reportId: string,
    status: 'resolved' | 'dismissed',
    adminNote?: string,
    banDays?: number,
    notify = true,
  ) {
    const days = banDays && banDays > 0 ? banDays : 0;
    if (days > 0 && status !== 'resolved') {
      throw new BadRequestException('반려한 신고에는 채팅 정지를 붙일 수 없어요.');
    }
    const _id = new Types.ObjectId(reportId);
    const updated = await this.reportModel.findOneAndUpdate(
      { _id, status: 'open' },
      { $set: { status, adminNote: (adminNote ?? '').trim(), handledBy: new Types.ObjectId(adminId), handledAt: Date.now() } },
      { returnDocument: 'after' },
    );
    if (!updated) {
      const exists = await this.reportModel.exists({ _id });
      if (!exists) throw new NotFoundException('신고를 찾을 수 없어요.');
      throw new BadRequestException('이미 처리된 신고예요.');
    }
    this.logger.log(`친구 채팅 신고 처리: report=${reportId} by=${adminId} → ${status}${days ? ` + ${days}일 채팅 정지` : ''}`);

    let ban: { days: number; until: number } | null = null;
    let notified = false;
    if (days > 0) {
      const reportedId = updated.reportedUserId.toString();
      try {
        const current = await this.usersService.getChatBan(reportedId);
        const until = Math.max(current?.until ?? 0, Date.now() + days * DAY_MS);
        await this.usersService.setChatBan(reportedId, until, REPORT_REASON_LABELS[updated.reason] ?? '');
        await this.reportModel.updateOne({ _id }, { $set: { sanctionDays: days, sanctionUntil: until } });
        ban = { days, until };
      } catch (e) {
        // 정지를 걸지 못했으면 신고를 처리 전 상태로 되돌려, 다시 시도할 수 있게 한다.
        await this.reportModel.updateOne(
          { _id },
          { $set: { status: 'open', adminNote: '', handledBy: null, handledAt: null } },
        );
        throw e;
      }
      this.logger.log(`채팅 정지 적용: user=${reportedId} until=${new Date(ban.until).toISOString()} by=${adminId}`);
      if (notify) notified = await this.notifyBan(adminId, reportedId, updated.reason, ban.until);
    }
    return { id: reportId, status, ban, notified };
  }

  // 정지된 유저에게 안내 우편을 보낸다. 우편이 실패해도 정지 자체는 이미 걸려 있으니 결과만 알려준다.
  private async notifyBan(adminId: string, userId: string, reason: ReportReason, until: number): Promise<boolean> {
    if (!this.mailService) return false;
    try {
      const at = new Date(until).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      await this.mailService.send(adminId, {
        target: 'users',
        userIds: [userId],
        title: BAN_NOTICE_TITLE,
        body: `"${REPORT_REASON_LABELS[reason] ?? '운영 정책 위반'}" 신고가 확인되어 친구 채팅과 공동 채팅방을 이용할 수 없게 되었어요.\n\n정지 기간: ${at}까지\n\n기간이 끝나면 자동으로 다시 이용할 수 있어요. 이의가 있으면 문의방으로 알려 주세요.`,
        expireDays: 30,
        push: true,
      } as AdminSendMailDto);
      return true;
    } catch (e) {
      this.logger.warn(`채팅 정지 안내 우편 실패: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  // 지금 채팅 정지 중인 유저 목록
  async listBans() {
    const users = await this.usersService.listChatBanned();
    return users.map((u) => ({
      userId: u._id.toString(),
      displayName: effectiveDisplayName(u),
      until: u.chatBannedUntil as number,
      reason: u.chatBanReason ?? '',
    }));
  }

  async liftBan(adminId: string, userId: string) {
    const ban = await this.usersService.getChatBan(userId);
    if (!ban) throw new BadRequestException('채팅이 정지된 유저가 아니에요.');
    await this.usersService.setChatBan(userId, null);
    this.logger.log(`채팅 정지 해제: user=${userId} by=${adminId}`);
    return { userId };
  }
}
