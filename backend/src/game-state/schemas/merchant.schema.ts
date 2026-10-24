import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MerchantDayDocument = HydratedDocument<MerchantDay>;

// 떠돌이 상인의 하루: 그날 처음 상인을 본 시점의 숲 날씨를 고정해서 하루 동안 가격이 날씨 따라 흔들리지 않게 한다.
@Schema({ collection: 'merchant_days' })
export class MerchantDay {
  @Prop({ required: true, unique: true })
  dayKey: string;

  // 그날의 숲 날씨(WeatherType). 날씨 정보가 없었으면 빈 문자열.
  @Prop({ default: '' })
  weather: string;

  @Prop({ type: Date, required: true })
  expireAt: Date;
}
export const MerchantDaySchema = SchemaFactory.createForClass(MerchantDay);
MerchantDaySchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
