import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MailDocument = HydratedDocument<Mail>;

// 우편에 첨부하는 자원. 0이면 그 자원은 없는 것이다.
@Schema({ _id: false })
export class MailRewards {
  @Prop({ default: 0, min: 0 })
  coins: number;

  @Prop({ default: 0, min: 0 })
  diamonds: number;

  @Prop({ default: 0, min: 0 })
  explorationTickets: number;
}
export const MailRewardsSchema = SchemaFactory.createForClass(MailRewards);

// 우편 한 통. 수신자마다 한 건씩 저장한다(전체 발송이면 유저 수만큼 만들고 batchId로 묶는다).
// 이렇게 두면 읽음/수령 상태가 우편마다 독립이고, 발송 뒤에 가입한 유저는 지난 우편을 받지 않는다.
@Schema({ timestamps: true, collection: 'mails' })
export class Mail {
  @Prop({ type: Types.ObjectId, required: true })
  recipientId: Types.ObjectId;

  // 한 번의 발송(관리자가 보내기를 누른 한 번)으로 만들어진 우편들을 묶는 id. 발송 내역 집계에 쓴다.
  @Prop({ required: true, index: true })
  batchId: string;

  @Prop({ required: true, trim: true, maxlength: 40 })
  title: string;

  @Prop({ default: '', maxlength: 500 })
  body: string;

  @Prop({ type: MailRewardsSchema, default: () => ({}) })
  rewards: MailRewards;

  // 첨부 자원이 하나라도 있으면 true. "받을 수 있는 우편"을 바로 조회하려고 따로 저장한다.
  @Prop({ default: false })
  hasRewards: boolean;

  // 보낸 관리자
  @Prop({ type: Types.ObjectId, required: true })
  sentBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  // 첨부 자원을 받은 시각. null이면 아직 안 받은 것이다.
  @Prop({ type: Date, default: null })
  claimedAt: Date | null;

  // 이 시각이 지나면 목록에서 사라지고(받을 수도 없다), DB의 TTL 인덱스가 문서를 지운다.
  @Prop({ type: Date, required: true })
  expiresAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MailSchema = SchemaFactory.createForClass(Mail);
MailSchema.index({ recipientId: 1, createdAt: -1 });
MailSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
