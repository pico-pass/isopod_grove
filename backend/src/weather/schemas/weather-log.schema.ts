import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WeatherLogDocument = HydratedDocument<WeatherLog>;

// 관측 기록 한 건. 시간 진행(advance)이 "그 시각의 날씨"를 알 수 있게 며칠 치를 보관하고, 서버를 다시 켜도 이어서 쓴다.
@Schema({ collection: 'weather_logs' })
export class WeatherLog {
  // 관측한 시각(ms)
  @Prop({ required: true, index: true })
  at: number;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  code: number;

  @Prop({ required: true })
  tempC: number;

  @Prop({ default: 0 })
  humidity: number;

  @Prop({ default: 0 })
  precipitation: number;

  // 이 시각이 지나면 자동으로 지운다(TTL)
  @Prop({ required: true })
  expireAt: Date;
}

export const WeatherLogSchema = SchemaFactory.createForClass(WeatherLog);
WeatherLogSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
