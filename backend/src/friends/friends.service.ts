import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Friendship, FriendshipDocument } from './schemas/friendship.schema';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { GameStateService } from '../game-state/game-state.service';
import { PresenceService } from '../presence/presence.service';

// 친구 선물: 보내는 사람은 아무것도 잃지 않는다(시스템이 지급). 받는 사람만 다이아가 늘어난다.
// 같은 친구에게는 하루에 한 번만 보낼 수 있고, 두 친구는 각자 독립적으로 하루 한 번씩 보낼 수 있다.
const FRIEND_GIFT_DIAMONDS = 2;

const dayKey = (now = Date.now()) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export interface FriendView {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  canGiftToday: boolean;
  online: boolean; // 지금 접속 중인지(친구에게만 보인다)
}

export interface FriendRequestView {
  requestId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friendship.name)
    private friendshipModel: Model<FriendshipDocument>,
    private readonly usersService: UsersService,
    private readonly gameStateService: GameStateService,
    // 접속 표시용. 끝자리에 둬서 기존 테스트 생성자 호출이 깨지지 않게 한다(PresenceModule은 전역이라 주입된다).
    private readonly presenceService?: PresenceService,
  ) {}

  async list(userId: string) {
    const me = new Types.ObjectId(userId);
    const docs = await this.friendshipModel
      .find({ $or: [{ requesterId: me }, { recipientId: me }] })
      .exec();

    const otherIds = new Set<string>();
    for (const doc of docs) {
      otherIds.add(
        doc.requesterId.toString() === userId
          ? doc.recipientId.toString()
          : doc.requesterId.toString(),
      );
    }
    const users = await this.usersService.findByIds([...otherIds]);
    const userById = new Map(users.map((u) => [u._id.toString(), u]));
    const today = dayKey();

    const friends: FriendView[] = [];
    const incomingRequests: FriendRequestView[] = [];
    const outgoingRequests: FriendRequestView[] = [];

    for (const doc of docs) {
      const requesterId = doc.requesterId.toString();
      const recipientId = doc.recipientId.toString();
      const otherId = requesterId === userId ? recipientId : requesterId;
      const other = userById.get(otherId);
      if (!other) continue;
      const view = {
        userId: otherId,
        displayName: effectiveDisplayName(other),
        avatarUrl: other.avatarUrl,
      };

      if (doc.status === 'accepted') {
        const lastGiftDay = doc.lastGiftDayByUser.get(userId);
        friends.push({
          ...view,
          canGiftToday: lastGiftDay !== today,
          online: this.presenceService?.isOnline(otherId) ?? false,
        });
      } else if (recipientId === userId) {
        incomingRequests.push({ requestId: doc._id.toString(), ...view });
      } else {
        outgoingRequests.push({ requestId: doc._id.toString(), ...view });
      }
    }

    return { friends, incomingRequests, outgoingRequests };
  }

  async search(userId: string, query: string) {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const candidates = await this.usersService.searchByName(trimmed, userId, 10);
    if (candidates.length === 0) return [];

    const me = new Types.ObjectId(userId);
    const candidateIds = candidates.map((c) => c._id);
    const existing = await this.friendshipModel
      .find({
        $or: [
          { requesterId: me, recipientId: { $in: candidateIds } },
          { recipientId: me, requesterId: { $in: candidateIds } },
        ],
      })
      .exec();
    const relatedIds = new Set(
      existing.flatMap((d) => [d.requesterId.toString(), d.recipientId.toString()]),
    );

    return candidates
      .filter((c) => !relatedIds.has(c._id.toString()))
      .map((c) => ({
        userId: c._id.toString(),
        displayName: effectiveDisplayName(c),
        avatarUrl: c.avatarUrl,
      }));
  }

  async sendRequest(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('나 자신에게는 친구 요청을 보낼 수 없어요.');
    }
    const target = await this.usersService.findById(targetUserId);
    if (!target) throw new BadRequestException('존재하지 않는 유저예요.');

    const me = new Types.ObjectId(userId);
    const other = new Types.ObjectId(targetUserId);
    const existing = await this.friendshipModel
      .findOne({
        $or: [
          { requesterId: me, recipientId: other },
          { requesterId: other, recipientId: me },
        ],
      })
      .exec();

    if (existing) {
      if (existing.status === 'accepted') {
        throw new BadRequestException('이미 친구예요.');
      }
      if (existing.requesterId.toString() === userId) {
        throw new BadRequestException('이미 요청을 보냈어요.');
      }
      // 상대가 이미 나에게 요청을 보내둔 상태라면, 내가 다시 보내는 건 바로 수락으로 처리한다.
      existing.status = 'accepted';
      await existing.save();
      return { message: `${effectiveDisplayName(target)}님과 친구가 됐어요!` };
    }

    await this.friendshipModel.create({
      requesterId: me,
      recipientId: other,
      status: 'pending',
      createdAt: Date.now(),
    });
    return { message: `${effectiveDisplayName(target)}님에게 친구 요청을 보냈어요.` };
  }

  async accept(userId: string, requestId: string) {
    const doc = await this.getPendingRequest(requestId);
    if (doc.recipientId.toString() !== userId) {
      throw new BadRequestException('내가 받은 요청만 수락할 수 있어요.');
    }
    doc.status = 'accepted';
    await doc.save();
    const other = await this.usersService.findById(doc.requesterId.toString());
    return { message: `${other ? effectiveDisplayName(other) : '상대'}님과 친구가 됐어요!` };
  }

  async decline(userId: string, requestId: string) {
    const doc = await this.getPendingRequest(requestId);
    if (
      doc.recipientId.toString() !== userId &&
      doc.requesterId.toString() !== userId
    ) {
      throw new BadRequestException('본인과 관련된 요청만 취소할 수 있어요.');
    }
    await doc.deleteOne();
    return { message: '요청을 취소했어요.' };
  }

  async remove(userId: string, friendUserId: string) {
    const doc = await this.getAcceptedFriendship(userId, friendUserId);
    await doc.deleteOne();
    return { message: '친구를 삭제했어요.' };
  }

  async gift(userId: string, friendUserId: string) {
    if (userId === friendUserId) {
      throw new BadRequestException('나 자신에게는 선물할 수 없어요.');
    }
    const doc = await this.getAcceptedFriendship(userId, friendUserId);

    const today = dayKey();
    if (doc.lastGiftDayByUser.get(userId) === today) {
      throw new BadRequestException('오늘은 이미 이 친구에게 선물을 보냈어요.');
    }

    const friend = await this.usersService.findById(friendUserId);
    if (!friend) throw new BadRequestException('존재하지 않는 유저예요.');

    const recipientState = await this.gameStateService.findOrCreate(friendUserId);
    recipientState.diamonds += FRIEND_GIFT_DIAMONDS;
    recipientState.logs.unshift({
      at: Date.now(),
      type: 'diamond',
      text: `숲지기 친구가 💎 ${FRIEND_GIFT_DIAMONDS}개를 선물해 줬어요!`,
    });
    if (recipientState.logs.length > 60) recipientState.logs.splice(60);
    await recipientState.save();

    doc.lastGiftDayByUser.set(userId, today);
    await doc.save();

    return {
      message: `${effectiveDisplayName(friend)}님에게 💎 ${FRIEND_GIFT_DIAMONDS}개를 선물했어요!`,
    };
  }

  private async getPendingRequest(requestId: string): Promise<FriendshipDocument> {
    const doc = await this.friendshipModel.findById(requestId).exec();
    if (!doc || doc.status !== 'pending') {
      throw new NotFoundException('존재하지 않는 요청이에요.');
    }
    return doc;
  }

  private async getAcceptedFriendship(
    userId: string,
    friendUserId: string,
  ): Promise<FriendshipDocument> {
    const me = new Types.ObjectId(userId);
    const other = new Types.ObjectId(friendUserId);
    const doc = await this.friendshipModel
      .findOne({
        status: 'accepted',
        $or: [
          { requesterId: me, recipientId: other },
          { requesterId: other, recipientId: me },
        ],
      })
      .exec();
    if (!doc) throw new BadRequestException('친구 관계가 아니에요.');
    return doc;
  }
}
