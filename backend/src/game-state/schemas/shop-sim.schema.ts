import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShopSimRecordDocument = HydratedDocument<ShopSimRecord>;
export type ShopSimDayDocument = HydratedDocument<ShopSimDay>;

// 버섯 가게 운영의 정식 영업 기록. 유저가 그날 한 번 낸 계획과 결과를 하루에 한 건씩 저장한다(순위의 기준이자 "오늘 이미 했다"는 표시).
@Schema({ collection: 'shop_sim_records' })
export class ShopSimRecord {
  @Prop({ required: true })
  dayKey: string; // 날짜(YYYY-MM-DD, 한국 시간)

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  profit: number;

  @Prop({ required: true, min: 0, max: 100 })
  efficiency: number;

  @Prop({ type: [Object], default: [] })
  plan: Record<string, unknown>[];

  @Prop({ type: Date, required: true })
  playedAt: Date;

  @Prop({ type: Date, required: true })
  expireAt: Date;
}
export const ShopSimRecordSchema = SchemaFactory.createForClass(ShopSimRecord);
ShopSimRecordSchema.index({ dayKey: 1, userId: 1 }, { unique: true });
ShopSimRecordSchema.index({ dayKey: 1, efficiency: -1, profit: -1, playedAt: 1 });
ShopSimRecordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// 그날의 장사 조건 중 날씨: 그날 처음 조회한 순간의 숲 날씨로 정해서 하루 동안 모두에게 같게 쓴다.
@Schema({ collection: 'shop_sim_days' })
export class ShopSimDay {
  @Prop({ required: true, unique: true })
  dayKey: string;

  @Prop({ required: true })
  weather: string;

  @Prop({ type: Date, required: true })
  expireAt: Date;
}
export const ShopSimDaySchema = SchemaFactory.createForClass(ShopSimDay);
ShopSimDaySchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
