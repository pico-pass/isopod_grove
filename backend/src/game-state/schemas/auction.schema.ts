import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuctionLotDocument = HydratedDocument<AuctionLot>;

// 매일 경매의 물건 하나: 날짜(day)마다 lot 0~2. 물건 정보는 만들 때 그대로 저장해서 나중에 카탈로그가 바뀌어도 그날의 경매는 변하지 않는다.
// 입찰은 최고가(top)를 비교해서 바꾸는 방식(CAS)이고, 밀린 입찰의 환불 기록(refunds)은 최고가가 바뀌는 같은 갱신에서 함께 남긴다(원자적).
@Schema({ collection: 'auction_lots' })
export class AuctionLot {
  @Prop({ required: true })
  day: string;

  @Prop({ required: true })
  lot: number;

  // 'equipment' | 'decor' | 'boost'
  @Prop({ required: true })
  kind: string;

  // 장비 id · 장식 id · 부스트 종류
  @Prop({ required: true })
  itemId: string;

  @Prop({ default: 0 })
  boostHours: number;

  @Prop({ required: true })
  minBid: number;

  // 마감 시각(ms)
  @Prop({ required: true })
  closesAt: number;

  // 지금 최고가. 입찰이 없으면 null.
  @Prop({ type: Object, default: null })
  top: { userId: Types.ObjectId; amount: number; at: number } | null;

  @Prop({ default: 0 })
  bids: number;

  // 최근 입찰 기록(최대 20개, 오래된 것부터)
  @Prop({ type: [Object], default: [] })
  history: { userId: Types.ObjectId; amount: number; at: number }[];

  // 밀린 입찰의 환불. 받으면 claimed가 true가 된다.
  @Prop({ type: [Object], default: [] })
  refunds: { userId: Types.ObjectId; amount: number; claimed: boolean }[];

  // 낙찰품을 지급했는지
  @Prop({ default: false })
  delivered: boolean;

  @Prop({ type: Date, required: true })
  expireAt: Date;
}
export const AuctionLotSchema = SchemaFactory.createForClass(AuctionLot);
AuctionLotSchema.index({ day: 1, lot: 1 }, { unique: true });
AuctionLotSchema.index({ 'refunds.userId': 1 });
AuctionLotSchema.index({ 'top.userId': 1 });
AuctionLotSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
