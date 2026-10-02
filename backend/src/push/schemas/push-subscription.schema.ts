import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PushSubscriptionDocument = HydratedDocument<PushSubscription>;

// 브라우저(기기)마다 하나씩 생기는 웹 푸시 구독. 한 유저가 여러 기기를 쓸 수 있다.
@Schema({ collection: 'push_subscriptions' })
export class PushSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  // 푸시 서비스(FCM 등)가 발급한 주소. 기기·브라우저마다 고유해서 이걸로 구독을 구분한다.
  @Prop({ required: true, unique: true })
  endpoint: string;

  @Prop({ required: true })
  p256dh: string;

  @Prop({ required: true })
  auth: string;

  @Prop({ default: '' })
  userAgent: string;

  @Prop({ required: true })
  createdAt: number;
}

export const PushSubscriptionSchema = SchemaFactory.createForClass(PushSubscription);
