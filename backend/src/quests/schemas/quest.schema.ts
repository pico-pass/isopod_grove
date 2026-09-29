import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type QuestDocument = HydratedDocument<Quest>;

@Schema({ collection: 'quests' })
export class Quest {
  @Prop({ required: true, unique: true })
  questId: string;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true, min: 1 })
  target: number;

  @Prop({ required: true, min: 0 })
  reward: number;

  // 완료 시 G 보상과 별도로 지급하는 숲 탐색권 개수(없으면 0장)
  @Prop({ default: 0, min: 0 })
  ticketReward: number;
}

export const QuestSchema = SchemaFactory.createForClass(Quest);
