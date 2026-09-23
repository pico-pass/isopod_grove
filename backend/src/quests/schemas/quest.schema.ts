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
}

export const QuestSchema = SchemaFactory.createForClass(Quest);
