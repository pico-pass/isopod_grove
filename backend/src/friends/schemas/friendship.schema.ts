import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FriendshipDocument = HydratedDocument<Friendship>;
export type FriendshipStatus = 'pending' | 'accepted';

@Schema({ collection: 'friendships' })
export class Friendship {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId;

  @Prop({ type: String, required: true, default: 'pending' })
  status: FriendshipStatus;

  @Prop({ required: true })
  createdAt: number;

  // key: 선물을 보낸 유저의 userId(string), value: 마지막으로 선물한 날짜 키(YYYY-M-D).
  // 두 친구가 각자 하루 한 번씩 보낼 수 있어서 방향별로 따로 기록한다.
  @Prop({ type: Map, of: String, default: {} })
  lastGiftDayByUser: Map<string, string>;
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);
FriendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });
FriendshipSchema.index({ recipientId: 1, status: 1 });
