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

  // 지금 분양 마켓에서 실제로 적용되는 가격. 시세 변동으로 주기적으로 바뀐다.
  @Prop({ required: true, min: 0 })
  price: number;

  // 희귀도 기준 원래 가격(기준가). 시세가 지금 비싼지 싼지 비교하는 기준이며, 변동하지 않는다.
  @Prop({ default: 0, min: 0 })
  basePrice: number;

  @Prop({ required: true, min: 0 })
  rate: number;

  @Prop({ required: true, min: 0 })
  breed: number;

  @Prop({ default: '/assets/isopod.png' })
  image: string;

  @Prop({ default: 'none' })
  filter: string;

  @Prop({ required: true })
  description: string;
}

export const SpeciesSchema = SchemaFactory.createForClass(Species);
