import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatMessage,
  ChatMessageDocument,
  DEFAULT_CHAT_CHANNEL,
} from './schemas/chat-message.schema';
import { UsersService, effectiveDisplayName } from '../users/users.service';

const MAX_MESSAGES = 300; // 채널별로 이 개수를 넘으면 오래된 메시지부터 지운다
const INITIAL_FETCH_LIMIT = 50;
const SEND_COOLDOWN_MS = 1500; // 채널과 무관하게 유저 1명 기준(채널을 바꿔도 도배 방지는 유지)

export interface ChatMessageView {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  channel: string;
  text: string;
  createdAt: number;
}

@Injectable()
export class ChatService {
  // 유저별 마지막 전송 시각. 서버 재시작 시 초기화돼도 괜찮은 가벼운 도배 방지용이라 메모리에만 둔다.
  private readonly lastSentAt = new Map<string, number>();

  constructor(
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
    private readonly usersService: UsersService,
  ) {}

  async getMessages(
    channel: string = DEFAULT_CHAT_CHANNEL,
    after?: string,
  ): Promise<ChatMessageView[]> {
    const query = {
      channel,
      ...(after ? { _id: { $gt: new Types.ObjectId(after) } } : {}),
    };
    const docs = await this.chatMessageModel
      .find(query)
      .sort({ _id: after ? 1 : -1 })
      .limit(after ? MAX_MESSAGES : INITIAL_FETCH_LIMIT)
      .exec();
    const ordered = after ? docs : docs.reverse();
    return this.toViews(ordered);
  }

  async sendMessage(
    userId: string,
    channel: string,
    text: string,
  ): Promise<ChatMessageView> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('메시지를 입력해 주세요.');
    }

    const now = Date.now();
    const last = this.lastSentAt.get(userId) || 0;
    if (now - last < SEND_COOLDOWN_MS) {
      throw new BadRequestException('너무 빨리 보내고 있어요. 잠시만요.');
    }
    this.lastSentAt.set(userId, now);

    const doc = await this.chatMessageModel.create({
      userId: new Types.ObjectId(userId),
      channel,
      text: trimmed,
      createdAt: now,
    });

    await this.trimOldMessages(channel);

    const [view] = await this.toViews([doc]);
    return view;
  }

  private async trimOldMessages(channel: string) {
    const count = await this.chatMessageModel.countDocuments({ channel }).exec();
    const excess = count - MAX_MESSAGES;
    if (excess <= 0) return;
    const oldest = await this.chatMessageModel
      .find({ channel }, { _id: 1 })
      .sort({ _id: 1 })
      .limit(excess)
      .exec();
    await this.chatMessageModel
      .deleteMany({ _id: { $in: oldest.map((d) => d._id) } })
      .exec();
  }

  private async toViews(
    docs: ChatMessageDocument[],
  ): Promise<ChatMessageView[]> {
    const userIds = [...new Set(docs.map((d) => d.userId.toString()))];
    const users = await this.usersService.findByIds(userIds);
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    return docs.map((doc) => {
      const id = doc.userId.toString();
      const user = userById.get(id);
      return {
        id: doc._id.toString(),
        userId: id,
        displayName: user ? effectiveDisplayName(user) : '알 수 없음',
        avatarUrl: user?.avatarUrl,
        channel: doc.channel,
        text: doc.text,
        createdAt: doc.createdAt,
      };
    });
  }
}
