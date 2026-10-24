import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UnderdogEntryDocument = HydratedDocument<UnderdogEntry>;

// 하극상 대회: 한 주(월~일)에 한 유저가 한 건. 주마다 점수가 처음부터 시작해서 주 키(weekKey)로 나눠 저장한다.
@Schema({ timestamps: true, collection: 'underdog_entries' })
export class UnderdogEntry {
  // 그 주 월요일의 날짜 문자열(예: '2026-10-19')
  @Prop({ required: true })
  weekKey: string;

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  // 출전 식구(희귀도 '일반' 종)
  @Prop({ required: true })
  speciesId: string;

  @Prop({ default: 0 })
  points: number;

  @Prop({ default: 0 })
  wins: number;

  @Prop({ default: 0 })
  losses: number;

  // 오늘(한국 날짜) 치른 경기 수. 날짜가 바뀌면 0부터 다시 센다.
  @Prop({ default: '' })
  matchDay: string;

  @Prop({ default: 0 })
  matchesToday: number;

  // 지난 주 순위 보상을 받았는지
  @Prop({ default: false })
  claimed: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UnderdogEntrySchema = SchemaFactory.createForClass(UnderdogEntry);
UnderdogEntrySchema.index({ weekKey: 1, userId: 1 }, { unique: true });
UnderdogEntrySchema.index({ weekKey: 1, points: -1 });
// 12주가 지난 기록은 지운다(마지막으로 갱신한 시각 기준)
UnderdogEntrySchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 84 });
