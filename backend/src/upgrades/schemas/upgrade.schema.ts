import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UpgradeDocument = HydratedDocument<Upgrade>;

@Schema({ collection: 'upgrades' })
export class Upgrade {
  @Prop({ required: true, unique: true })
  upgradeId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ required: true, min: 1 })
  max: number;

  @Prop({ required: true, min: 0 })
  cost: number;

  @Prop({ required: true, min: 1 })
  factor: number;

  @Prop({ required: true })
  description: string;
}

export const UpgradeSchema = SchemaFactory.createForClass(Upgrade);
