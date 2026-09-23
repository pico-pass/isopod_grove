import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GameStateDocument = HydratedDocument<GameState>;

@Schema({ _id: false })
export class DailyProgress {
  @Prop({ required: true })
  day: string;

  @Prop({ default: 0 })
  feed: number;

  @Prop({ default: 0 })
  observe: number;

  @Prop({ default: 0 })
  births: number;

  @Prop({ type: [String], default: [] })
  claimed: string[];
}
export const DailyProgressSchema = SchemaFactory.createForClass(DailyProgress);

@Schema({ _id: false })
export class Stats {
  @Prop({ default: 0 })
  births: number;

  @Prop({ default: 0 })
  sold: number;

  @Prop({ default: 0 })
  earned: number;

  @Prop({ default: 0 })
  explored: number;

  @Prop({ default: 0 })
  played: number;
}
export const StatsSchema = SchemaFactory.createForClass(Stats);

@Schema({ _id: false })
export class LogEntry {
  @Prop({ required: true })
  at: number;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  text: string;
}
export const LogEntrySchema = SchemaFactory.createForClass(LogEntry);

@Schema({
  timestamps: true,
  collection: 'game_states',
  toJSON: { flattenMaps: true },
  toObject: { flattenMaps: true },
})
export class GameState {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: 400, min: 0 })
  coins: number;

  @Prop({ default: 0, min: 0 })
  pending: number;

  @Prop({ default: 0, min: 0 })
  xp: number;

  @Prop({ default: 85, min: 0, max: 100 })
  food: number;

  @Prop({ default: 78, min: 0, max: 100 })
  humidity: number;

  @Prop({ default: 24 })
  temperature: number;

  // key: speciesId, value: 보유 마리 수
  @Prop({ type: Map, of: Number, default: {} })
  population: Map<string, number>;

  // 지금까지 발견(도감 등록)한 speciesId 목록
  @Prop({ type: [String], default: ['vulgare'] })
  discovered: string[];

  // key: speciesId, value: 번식 진행 시간(초)
  @Prop({ type: Map, of: Number, default: {} })
  breeding: Map<string, number>;

  // key: upgradeId, value: 현재 레벨
  @Prop({ type: Map, of: Number, default: {} })
  upgrades: Map<string, number>;

  @Prop({
    type: DailyProgressSchema,
    default: () => ({ day: '', feed: 0, observe: 0, births: 0, claimed: [] }),
  })
  daily: DailyProgress;

  @Prop({ type: StatsSchema, default: () => ({}) })
  stats: Stats;

  // key: 행동 id('feed' | 'mist' | 'climate' | 'observe'), value: 쿨다운 해제 시각(ms epoch)
  @Prop({ type: Map, of: Number, default: {} })
  cooldowns: Map<string, number>;

  @Prop({ type: [LogEntrySchema], default: [] })
  logs: LogEntry[];

  @Prop({ default: false })
  paused: boolean;

  @Prop({ default: false })
  sound: boolean;
}

export const GameStateSchema = SchemaFactory.createForClass(GameState);
