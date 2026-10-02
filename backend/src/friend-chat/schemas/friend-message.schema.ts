import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FriendMessageDocument = HydratedDocument<FriendMessage>;

export const FRIEND_MESSAGE_MAX_LENGTH = 300;

// 친구끼리 주고받는 1:1 메시지. 두 사람의 대화는 conversationKey 하나로 묶인다.
@Schema({ collection: 'friend_messages' })
export class FriendMessage {
  // 두 userId를 문자열로 정렬해 "작은쪽:큰쪽"으로 만든다(누가 먼저 보냈든 같은 키).
  @Prop({ required: true })
  conversationKey: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId;

  // 삭제된 메시지는 빈 문자열이라 required를 걸지 않는다(작성할 때의 길이·공백 검사는 서비스가 한다).
  @Prop({ default: '', maxlength: FRIEND_MESSAGE_MAX_LENGTH })
  text: string;

  @Prop({ required: true })
  createdAt: number;

  // 받는 사람이 대화창에서 가져간 시각(ms). null이면 아직 안 읽은 메시지다.
  @Prop({ type: Number, default: null })
  readAt: number | null;

  // 보낸 사람이 삭제한 시각(ms). 삭제하면 내용을 비우고 "삭제된 메시지"로만 남긴다(대화의 앞뒤 흐름은 유지).
  @Prop({ type: Number, default: null })
  deletedAt: number | null;
}

export const FriendMessageSchema = SchemaFactory.createForClass(FriendMessage);
FriendMessageSchema.index({ conversationKey: 1, _id: 1 });
FriendMessageSchema.index({ recipientId: 1, readAt: 1 });
