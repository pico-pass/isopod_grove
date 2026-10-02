import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { Mail, MailDocument, MailRewards } from './schemas/mail.schema';
import {
  AdminSendMailDto,
  MAIL_DEFAULT_EXPIRE_DAYS,
} from './dto/admin-send-mail.dto';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { GameStateService } from '../game-state/game-state.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const LIST_LIMIT = 100;
const INSERT_CHUNK = 500;

export interface MailView {
  id: string;
  title: string;
  body: string;
  rewards: MailRewards;
  hasRewards: boolean;
  read: boolean;
  claimed: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface MailSummary {
  unread: number; // 아직 안 읽은 우편
  claimable: number; // 받지 않은 자원이 남은 우편
  badge: number; // 둘 중 하나라도 해당하는 우편 수(사이드바 배지용)
}

type LeanMail = Pick<
  Mail,
  'title' | 'body' | 'rewards' | 'hasRewards' | 'readAt' | 'claimedAt' | 'expiresAt'
> & { _id: Types.ObjectId; createdAt?: Date };

export const describeRewards = (r: MailRewards): string =>
  [
    r.coins ? `+${r.coins.toLocaleString('ko-KR')} G` : '',
    r.diamonds ? `💎 ${r.diamonds.toLocaleString('ko-KR')}개` : '',
    r.explorationTickets ? `🎟️ 탐색권 ${r.explorationTickets.toLocaleString('ko-KR')}장` : '',
  ]
    .filter(Boolean)
    .join(' · ');

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectModel(Mail.name) private mailModel: Model<MailDocument>,
    private readonly usersService: UsersService,
    private readonly gameStateService: GameStateService,
  ) {}

  // ---------- 관리자 ----------

  // 우편을 보낸다. all이면 가입한 모든 유저, users면 고른 유저에게 한 통씩 만든다.
  async send(adminId: string, dto: AdminSendMailDto) {
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('제목을 입력해 주세요.');
    const rewards: MailRewards = {
      coins: dto.coins ?? 0,
      diamonds: dto.diamonds ?? 0,
      explorationTickets: dto.explorationTickets ?? 0,
    };
    const hasRewards = rewards.coins + rewards.diamonds + rewards.explorationTickets > 0;
    const body = (dto.body ?? '').trim();
    if (!body && !hasRewards) {
      throw new BadRequestException('내용이나 보낼 자원 중 하나는 있어야 해요.');
    }

    let recipientIds: string[];
    if (dto.target === 'all') {
      recipientIds = await this.usersService.findAllIds();
    } else {
      const wanted = [...new Set(dto.userIds ?? [])];
      const found = await this.usersService.findByIds(wanted);
      const foundIds = new Set(found.map((u) => u._id.toString()));
      const missing = wanted.filter((id) => !foundIds.has(id));
      if (missing.length) {
        throw new BadRequestException(`존재하지 않는 유저가 있어요. (${missing.length}명)`);
      }
      recipientIds = [...foundIds];
    }
    if (recipientIds.length === 0) {
      throw new BadRequestException('우편을 받을 유저가 없어요.');
    }

    const batchId = randomBytes(8).toString('hex');
    const expiresAt = new Date(Date.now() + (dto.expireDays ?? MAIL_DEFAULT_EXPIRE_DAYS) * DAY_MS);
    const sentBy = new Types.ObjectId(adminId);
    for (let i = 0; i < recipientIds.length; i += INSERT_CHUNK) {
      await this.mailModel.insertMany(
        recipientIds.slice(i, i + INSERT_CHUNK).map((id) => ({
          recipientId: new Types.ObjectId(id),
          batchId,
          title,
          body,
          rewards,
          hasRewards,
          sentBy,
          expiresAt,
        })),
      );
    }
    this.logger.log(
      `우편 발송 batch=${batchId} by=${adminId} → ${dto.target === 'all' ? '전체' : '선택'} ${recipientIds.length}명 · "${title}"${hasRewards ? ` · ${describeRewards(rewards)}` : ''}`,
    );
    return {
      batchId,
      recipients: recipientIds.length,
      message: `우편을 ${recipientIds.length}명에게 보냈어요.`,
    };
  }

  // 최근 발송 내역. 발송 한 번(batchId)당 한 줄이며, 받은 사람 수와 자원을 수령한 사람 수를 함께 보여준다.
  async history(limit = 30) {
    const rows = await this.mailModel.aggregate<{
      _id: string;
      title: string;
      body: string;
      rewards: MailRewards;
      createdAt: Date;
      expiresAt: Date;
      recipients: number;
      claimed: number;
      read: number;
    }>([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$batchId',
          title: { $first: '$title' },
          body: { $first: '$body' },
          rewards: { $first: '$rewards' },
          createdAt: { $first: '$createdAt' },
          expiresAt: { $first: '$expiresAt' },
          recipients: { $sum: 1 },
          claimed: { $sum: { $cond: [{ $ne: ['$claimedAt', null] }, 1, 0] } },
          read: { $sum: { $cond: [{ $ne: ['$readAt', null] }, 1, 0] } },
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
    ]);
    return rows.map((r) => ({
      batchId: r._id,
      title: r.title,
      body: r.body,
      rewards: r.rewards,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      recipients: r.recipients,
      read: r.read,
      claimed: r.claimed,
    }));
  }

  async searchUsers(query: string) {
    const users = await this.usersService.adminSearch(query, 10);
    return users.map((u) => ({
      userId: u._id.toString(),
      displayName: effectiveDisplayName(u),
      email: u.email,
      avatarUrl: u.avatarUrl,
    }));
  }

  // ---------- 유저 ----------

  private toView(m: LeanMail): MailView {
    return {
      id: m._id.toString(),
      title: m.title,
      body: m.body,
      rewards: {
        coins: m.rewards?.coins ?? 0,
        diamonds: m.rewards?.diamonds ?? 0,
        explorationTickets: m.rewards?.explorationTickets ?? 0,
      },
      hasRewards: m.hasRewards,
      read: !!m.readAt,
      claimed: !!m.claimedAt,
      createdAt: (m.createdAt ?? new Date(0)).toISOString(),
      expiresAt: m.expiresAt.toISOString(),
    };
  }

  async list(userId: string) {
    const mails = await this.mailModel
      .find({ recipientId: new Types.ObjectId(userId), expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1, _id: -1 })
      .limit(LIST_LIMIT)
      .lean<LeanMail[]>();
    return { mails: mails.map((m) => this.toView(m)), summary: await this.summary(userId) };
  }

  async summary(userId: string): Promise<MailSummary> {
    const base = { recipientId: new Types.ObjectId(userId), expiresAt: { $gt: new Date() } };
    const claimableFilter = { hasRewards: true, claimedAt: null };
    const [unread, claimable, badge] = await Promise.all([
      this.mailModel.countDocuments({ ...base, readAt: null }),
      this.mailModel.countDocuments({ ...base, ...claimableFilter }),
      this.mailModel.countDocuments({ ...base, $or: [{ readAt: null }, claimableFilter] }),
    ]);
    return { unread, claimable, badge };
  }

  private requireObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('우편을 찾을 수 없어요.');
    }
    return new Types.ObjectId(id);
  }

  async markRead(userId: string, mailId: string) {
    const _id = this.requireObjectId(mailId);
    const recipientId = new Types.ObjectId(userId);
    const mail = await this.mailModel.findOne({ _id, recipientId, expiresAt: { $gt: new Date() } }, { _id: 1 }).lean();
    if (!mail) throw new NotFoundException('우편을 찾을 수 없어요.');
    await this.mailModel.updateOne({ _id, recipientId, readAt: null }, { $set: { readAt: new Date() } });
    return { summary: await this.summary(userId) };
  }

  // 첨부 자원을 받는다. 먼저 DB에서 "아직 안 받은 우편"만 원자적으로 받은 상태로 바꿔서(동시에 두 번 눌러도
  // 한 번만 성공) 자원을 지급하고, 지급이 실패하면 받은 상태를 되돌린다.
  async claim(userId: string, mailId: string) {
    const _id = this.requireObjectId(mailId);
    const recipientId = new Types.ObjectId(userId);
    const now = new Date();
    const mail = await this.mailModel.findOneAndUpdate(
      { _id, recipientId, hasRewards: true, claimedAt: null, expiresAt: { $gt: now } },
      { $set: { claimedAt: now, readAt: now } },
      { returnDocument: 'after' },
    );
    if (!mail) {
      const existing = await this.mailModel
        .findOne({ _id, recipientId, expiresAt: { $gt: now } }, { hasRewards: 1, claimedAt: 1 })
        .lean();
      if (!existing) throw new NotFoundException('우편을 찾을 수 없어요. 보관 기간이 지났을 수 있어요.');
      if (!existing.hasRewards) throw new BadRequestException('받을 자원이 없는 우편이에요.');
      throw new BadRequestException('이미 받은 우편이에요.');
    }
    try {
      const result = await this.gameStateService.grantMailRewards(userId, mail.rewards, mail.title);
      return { ...result, summary: await this.summary(userId) };
    } catch (e) {
      await this.mailModel.updateOne({ _id, claimedAt: now }, { $set: { claimedAt: null } });
      throw e;
    }
  }

  // 받을 수 있는 우편의 자원을 한꺼번에 받는다.
  async claimAll(userId: string) {
    const recipientId = new Types.ObjectId(userId);
    const now = new Date();
    const candidates = await this.mailModel
      .find({ recipientId, hasRewards: true, claimedAt: null, expiresAt: { $gt: now } }, { _id: 1 })
      .sort({ createdAt: 1 })
      .limit(LIST_LIMIT)
      .lean();

    const claimed: MailDocument[] = [];
    for (const c of candidates) {
      const mail = await this.mailModel.findOneAndUpdate(
        { _id: c._id, recipientId, hasRewards: true, claimedAt: null, expiresAt: { $gt: now } },
        { $set: { claimedAt: now, readAt: now } },
        { returnDocument: 'after' },
      );
      if (mail) claimed.push(mail);
    }
    if (claimed.length === 0) {
      throw new BadRequestException('받을 수 있는 우편이 없어요.');
    }

    const total: MailRewards = { coins: 0, diamonds: 0, explorationTickets: 0 };
    for (const m of claimed) {
      total.coins += m.rewards.coins;
      total.diamonds += m.rewards.diamonds;
      total.explorationTickets += m.rewards.explorationTickets;
    }
    try {
      const result = await this.gameStateService.grantMailRewards(
        userId,
        total,
        claimed.length === 1 ? claimed[0].title : `우편 ${claimed.length}통`,
      );
      return { ...result, claimed: claimed.length, summary: await this.summary(userId) };
    } catch (e) {
      await this.mailModel.updateMany(
        { _id: { $in: claimed.map((m) => m._id) }, claimedAt: now },
        { $set: { claimedAt: null } },
      );
      throw e;
    }
  }

  // 읽은 우편 삭제. 받지 않은 자원이 남은 우편은 지울 수 없다(실수로 자원을 잃지 않도록).
  async remove(userId: string, mailId: string) {
    const _id = this.requireObjectId(mailId);
    const recipientId = new Types.ObjectId(userId);
    const res = await this.mailModel.deleteOne({
      _id,
      recipientId,
      $or: [{ hasRewards: false }, { claimedAt: { $ne: null } }],
    });
    if (res.deletedCount === 0) {
      const existing = await this.mailModel.findOne({ _id, recipientId }, { _id: 1 }).lean();
      if (existing) throw new BadRequestException('받지 않은 자원이 있는 우편은 삭제할 수 없어요. 먼저 받아 주세요.');
      throw new NotFoundException('우편을 찾을 수 없어요.');
    }
    return { summary: await this.summary(userId) };
  }
}
