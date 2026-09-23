import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SpeciesDocument = HydratedDocument<Species>;

@Schema({ collection: 'species' })
export class Species {
  @Prop({ required: true, unique: true })
  speciesId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  latin: string;

  @Prop({ required: true, min: 0, max: 4 })
  rarity: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  rate: number;

  @Prop({ required: true, min: 0 })
  breed: number;

  @Prop({ default: 'none' })
  filter: string;

  @Prop({ required: true })
  description: string;
}

export const SpeciesSchema = SchemaFactory.createForClass(Species);
