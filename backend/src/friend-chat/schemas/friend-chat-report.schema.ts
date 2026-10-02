import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FriendChatReportDocument = HydratedDocument<FriendChatReport>;

export const REPORT_REASONS = ['abuse', 'spam', 'inappropriate', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  abuse: '욕설·비방',
  spam: '도배·광고',
  inappropriate: '불쾌하거나 부적절한 내용',
  other: '기타',
};
export const REPORT_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

@Schema({ _id: false })
export class ReportContextMessage {
  @Prop({ type: Types.ObjectId, required: true })
  messageId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  senderId: Types.ObjectId;

  @Prop({ default: '' })
  text: string;

  @Prop({ required: true })
  createdAt: number;
}
export const ReportContextMessageSchema = SchemaFactory.createForClass(ReportContextMessage);

// 친구 채팅 메시지 신고. 신고한 시점의 내용을 그대로 복사해 두므로, 상대가 나중에 메시지를 삭제해도 운영자가 확인할 수 있다.
@Schema({ collection: 'friend_chat_reports' })
export class FriendChatReport {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reporterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reportedUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  messageId: Types.ObjectId;

  @Prop({ required: true })
  conversationKey: string;

  // 신고된 메시지의 내용(신고 시점)
  @Prop({ required: true })
  messageText: string;

  // 신고된 메시지 앞뒤의 대화(신고 시점). 맥락을 보고 판단할 수 있게 한다.
  @Prop({ type: [ReportContextMessageSchema], default: [] })
  context: ReportContextMessage[];

  @Prop({ type: String, required: true })
  reason: ReportReason;

  @Prop({ default: '', maxlength: 200 })
  detail: string;

  @Prop({ type: String, default: 'open' })
  status: ReportStatus;

  @Prop({ default: '', maxlength: 200 })
  adminNote: string;

  @Prop({ type: Types.ObjectId, default: null })
  handledBy: Types.ObjectId | null;

  @Prop({ type: Number, default: null })
  handledAt: number | null;

  // 처리하면서 함께 건 채팅 정지(일 수와 풀리는 시각). 정지를 걸지 않았으면 null이다.
  @Prop({ type: Number, default: null })
  sanctionDays: number | null;

  @Prop({ type: Number, default: null })
  sanctionUntil: number | null;

  @Prop({ required: true })
  createdAt: number;
}

export const FriendChatReportSchema = SchemaFactory.createForClass(FriendChatReport);
// 같은 사람이 같은 메시지를 두 번 신고하지 못한다.
FriendChatReportSchema.index({ reporterId: 1, messageId: 1 }, { unique: true });
FriendChatReportSchema.index({ status: 1, createdAt: -1 });
