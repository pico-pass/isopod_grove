import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RestorationWeekDocument = HydratedDocument<RestorationWeek>;
export type RestorationEntryDocument = HydratedDocument<RestorationEntry>;

// 숲 복원 프로젝트의 한 주: 모든 유저가 같이 쌓는 게이지. 점수는 $inc로 원자적으로 올린다.
@Schema({ collection: 'restoration_weeks' })
export class RestorationWeek {
  // 그 주 월요일 날짜('년-월-일', 하극상 대회와 같은 weekKeyOf)
  @Prop({ required: true, unique: true })
  weekKey: string;

  // 주가 시작될 때 정해서 그 주 내내 바뀌지 않는 목표 점수
  @Prop({ required: true })
  goal: number;

  @Prop({ default: 0 })
  points: number;

  // 점수를 한 번이라도 쌓은 사람 수
  @Prop({ default: 0 })
  contributors: number;

  // 행동별 횟수(화면에 보여 주는 용도)
  @Prop({ default: 0 })
  explores: number;

  @Prop({ default: 0 })
  expeditions: number;

  @Prop({ default: 0 })
  battles: number;

  @Prop({ default: 0 })
  dungeons: number;

  @Prop({ type: Date, required: true })
  expireAt: Date;
}
export const RestorationWeekSchema = SchemaFactory.createForClass(RestorationWeek);
RestorationWeekSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// 한 주에 한 유저가 한 건: 내가 쌓은 점수와 받은 보상
@Schema({ timestamps: true, collection: 'restoration_entries' })
export class RestorationEntry {
  @Prop({ required: true })
  weekKey: string;

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ default: 0 })
  points: number;

  // 오늘(한국 날짜) 쌓은 점수. 날짜가 바뀌면 0부터 다시 센다.
  @Prop({ default: '' })
  dayKey: string;

  @Prop({ default: 0 })
  dayPoints: number;

  // 받은 보상 id(마일스톤 m25… 개인 p30…)
  @Prop({ type: [String], default: [] })
  claimed: string[];

  createdAt?: Date;
  updatedAt?: Date;
}
export const RestorationEntrySchema = SchemaFactory.createForClass(RestorationEntry);
RestorationEntrySchema.index({ weekKey: 1, userId: 1 }, { unique: true });
RestorationEntrySchema.index({ weekKey: 1, points: -1 });
// 10주가 지난 기록은 지운다(마지막으로 갱신한 시각 기준)
RestorationEntrySchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 70 });
