import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TerrariumLikeDocument = HydratedDocument<TerrariumLike>;

// 다른 유저의 사육장에 누른 좋아요 한 건. 같은 사람이 같은 사육장에는 한 번만 누를 수 있고(유니크 인덱스), 다시 누르면 취소된다.
// 사육장 주인이 받은 좋아요 수는 이 컬렉션을 세어서 구한다(게임 상태에 따로 세어 두지 않는다 — 두 곳이 어긋나지 않게).
@Schema({ collection: 'terrarium_likes' })
export class TerrariumLike {
  // 사육장 주인
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true })
  terrariumId: string;

  // 좋아요를 누른 사람
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  likerId: Types.ObjectId;

  @Prop({ required: true })
  createdAt: number;
}

export const TerrariumLikeSchema = SchemaFactory.createForClass(TerrariumLike);
TerrariumLikeSchema.index({ ownerId: 1, terrariumId: 1, likerId: 1 }, { unique: true });
TerrariumLikeSchema.index({ ownerId: 1, createdAt: -1 });
TerrariumLikeSchema.index({ likerId: 1, ownerId: 1 });
