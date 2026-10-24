import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ForestEventDocument = HydratedDocument<ForestEvent>;
export type NewsEditionDocument = HydratedDocument<NewsEdition>;

// 숲 신문 기사거리: 서버 어딘가에서 있었던 눈에 띄는 일을 짧게 남긴다(전설·신화 발견, 던전 도전, 수배 금등급 검거 등).
// 기록은 며칠 뒤 TTL 인덱스가 지운다. 쓰는 곳은 GameStateService.recordForestEvent 하나다(실패해도 게임에는 영향이 없다).
@Schema({ collection: 'forest_events' })
export class ForestEvent {
  @Prop({ required: true })
  at: number;

  // 한국 날짜(YYYY-MM-DD, 퍼즐과 같은 기준)
  @Prop({ required: true })
  day: string;

  // 'rare'(전설·신화 발견) | 'dungeon' | 'wanted' …
  @Prop({ required: true })
  type: string;

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  data: Record<string, unknown>;

  @Prop({ type: Date, required: true })
  expireAt: Date;
}
export const ForestEventSchema = SchemaFactory.createForClass(ForestEvent);
ForestEventSchema.index({ day: 1, type: 1 });
ForestEventSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// 하루에 한 호 발행하는 숲 신문. 그날 처음 읽는 사람이 있을 때 어제의 기록으로 만들어서 저장하고, 이후에는 같은 호를 보여 준다.
@Schema({ collection: 'forest_news' })
export class NewsEdition {
  @Prop({ required: true, unique: true })
  dayKey: string;

  @Prop({ type: [Object], default: [] })
  articles: Record<string, unknown>[];

  @Prop({ type: Date, required: true })
  expireAt: Date;
}
export const NewsEditionSchema = SchemaFactory.createForClass(NewsEdition);
NewsEditionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
