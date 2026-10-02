import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

export interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

// nickname을 정했으면 그걸, 아니면 구글 프로필 이름을 화면에 보여준다.
export function effectiveDisplayName(user: {
  nickname?: string;
  displayName: string;
}): string {
  return user.nickname || user.displayName;
}

export type NotificationCategory = 'friendChat' | 'mail';
export interface NotificationPrefsView {
  friendChat: boolean;
  mail: boolean;
}

// 채팅이 정지된 유저가 메시지를 보내려 할 때 보여주는 안내. 풀리는 시각(한국 시간)과 남은 시간을 알려준다.
export function chatBanMessage(until: number, now = Date.now()): string {
  const minutes = Math.max(1, Math.ceil((until - now) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const left = days > 0 ? `${days}일 ${hours}시간` : hours > 0 ? `${hours}시간 ${minutes % 60}분` : `${minutes}분`;
  const at = new Date(until).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `채팅이 정지된 상태예요. ${at}까지 메시지를 보낼 수 없어요. (${left} 남음)`;
}

const MONGO_DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  findByIds(ids: (string | Types.ObjectId)[]): Promise<UserDocument[]> {
    return this.userModel.find({ _id: { $in: ids } }).exec();
  }

  // 닉네임(직접 정한 이름) 또는 구글 표시 이름으로 유저를 찾는다. 친구 추가 검색에 쓴다.
  searchByName(
    query: string,
    excludeUserId: string,
    limit = 10,
  ): Promise<UserDocument[]> {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    return this.userModel
      .find({
        _id: { $ne: excludeUserId },
        $or: [{ nickname: regex }, { displayName: regex }],
      })
      .limit(limit)
      .exec();
  }

  // 우편 "전체 발송"의 수신자 목록. 가입한 모든 유저의 id를 돌려준다.
  async findAllIds(): Promise<string[]> {
    const docs = await this.userModel.find({}, { _id: 1 }).lean().exec();
    return docs.map((d) => d._id.toString());
  }

  // 관리자용 유저 검색. 닉네임·구글 이름·이메일로 찾고, 검색어가 비어 있으면 최근 가입한 유저를 보여준다.
  // (친구 검색과 달리 자기 자신도 포함한다 — 관리자가 자기 계정으로 시험 발송을 해볼 수 있게.)
  adminSearch(query: string, limit = 10): Promise<UserDocument[]> {
    const trimmed = query.trim();
    const regex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const filter = trimmed
      ? { $or: [{ nickname: regex }, { displayName: regex }, { email: regex }] }
      : {};
    return this.userModel.find(filter).sort({ createdAt: -1 }).limit(limit).exec();
  }

  // ---- 채팅 정지 ----

  // 지금 정지 중이면 풀리는 시각과 사유를, 아니면 null을 돌려준다(기간이 지난 정지는 자동으로 풀린 것으로 본다).
  async getChatBan(userId: string): Promise<{ until: number; reason: string } | null> {
    const user = await this.userModel
      .findById(userId, { chatBannedUntil: 1, chatBanReason: 1 })
      .lean<{ chatBannedUntil?: number | null; chatBanReason?: string }>()
      .exec();
    const until = user?.chatBannedUntil;
    if (!until || until <= Date.now()) return null;
    return { until, reason: user?.chatBanReason ?? '' };
  }

  // until이 null이면 정지를 푼다.
  async setChatBan(userId: string, until: number | null, reason = ''): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { $set: { chatBannedUntil: until, chatBanReason: until ? reason : '' } })
      .exec();
  }

  // 지금 정지 중인 유저(풀리는 시각이 먼 순서)
  listChatBanned(limit = 100): Promise<UserDocument[]> {
    return this.userModel
      .find({ chatBannedUntil: { $gt: Date.now() } })
      .sort({ chatBannedUntil: -1 })
      .limit(limit)
      .exec();
  }

  // ---- 알림 설정 ----

  async getNotificationPrefs(userId: string): Promise<NotificationPrefsView> {
    const user = await this.userModel
      .findById(userId, { notificationPrefs: 1 })
      .lean<{ notificationPrefs?: Partial<NotificationPrefsView> }>()
      .exec();
    // 값이 없는 예전 계정은 모두 켜진 것으로 본다.
    return {
      friendChat: user?.notificationPrefs?.friendChat ?? true,
      mail: user?.notificationPrefs?.mail ?? true,
    };
  }

  async setNotificationPrefs(userId: string, patch: Partial<NotificationPrefsView>): Promise<NotificationPrefsView> {
    const set: Record<string, boolean> = {};
    if (typeof patch.friendChat === 'boolean') set['notificationPrefs.friendChat'] = patch.friendChat;
    if (typeof patch.mail === 'boolean') set['notificationPrefs.mail'] = patch.mail;
    if (Object.keys(set).length === 0) {
      throw new BadRequestException('변경할 알림 설정이 없어요.');
    }
    await this.userModel.updateOne({ _id: userId }, { $set: set }).exec();
    return this.getNotificationPrefs(userId);
  }

  // 그 종류의 알림을 꺼 둔 유저들(푸시를 보낼 때 이 유저들은 뺀다)
  async findNotificationOptOuts(userIds: string[], category: NotificationCategory): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const docs = await this.userModel
      .find({ _id: { $in: userIds }, [`notificationPrefs.${category}`]: false }, { _id: 1 })
      .lean()
      .exec();
    return new Set(docs.map((d) => d._id.toString()));
  }

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.userModel
      .findById(userId, { isAdmin: 1 })
      .exec();
    return !!user?.isAdmin;
  }

  count(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }

  async findOrCreateFromGoogle(profile: GoogleProfile): Promise<UserDocument> {
    const existing = await this.findByGoogleId(profile.googleId);
    if (existing) {
      existing.email = profile.email;
      existing.displayName = profile.displayName;
      existing.avatarUrl = profile.avatarUrl;
      return existing.save();
    }
    return this.userModel.create(profile);
  }

  async isNicknameTaken(nickname: string, excludeUserId: string): Promise<boolean> {
    const existing = await this.userModel
      .findOne({ nickname, _id: { $ne: excludeUserId } })
      .exec();
    return !!existing;
  }

  async setProfileMessage(userId: string, message: string): Promise<UserDocument> {
    const trimmed = message.trim();
    if (trimmed.length > 60) {
      throw new BadRequestException('프로필 메시지는 60자 이하로 입력해 주세요.');
    }
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없어요.');
    }
    user.profileMessage = trimmed; // 빈 문자열이면 메시지가 지워진 걸로 본다
    return user.save();
  }

  async setNickname(userId: string, nickname: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없어요.');
    }
    user.nickname = nickname;
    try {
      return await user.save();
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        e.code === MONGO_DUPLICATE_KEY_ERROR
      ) {
        throw new BadRequestException('이미 사용 중인 닉네임이에요.');
      }
      throw e;
    }
  }
}
