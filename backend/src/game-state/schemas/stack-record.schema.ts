import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StackRecordDocument = HydratedDocument<StackRecord>;

// 콩 쌓기 기록. 유저가 그날 가장 높이 쌓은 칸 수를 하루에 한 건씩 저장한다(순위의 기준). 오래된 기록은 TTL 인덱스가 지운다.
@Schema({ collection: 'stack_records' })
export class StackRecord {
  @Prop({ required: true })
  dayKey: string; // 날짜(YYYY-MM-DD, 한국 시간)

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  bestHeight: number;

  // 그 기록을 처음 세운 시각(같은 높이끼리 먼저 달성한 사람을 앞에 보여주는 데만 쓴다. 순위 번호는 같다)
  @Prop({ type: Date, required: true })
  bestAt: Date;

  // 그 기록을 세운 콩벌레(종). 희귀도마다 퍼펙트 허용치가 달라서 순위에 함께 보여준다.
  @Prop({ default: '' })
  speciesId: string;

  // 그날 끝까지 쌓은(검증을 통과한) 횟수
  @Prop({ default: 1 })
  runs: number;

  @Prop({ type: Date, required: true })
  expireAt: Date;
}

export const StackRecordSchema = SchemaFactory.createForClass(StackRecord);
StackRecordSchema.index({ dayKey: 1, userId: 1 }, { unique: true });
StackRecordSchema.index({ dayKey: 1, bestHeight: -1, bestAt: 1 });
StackRecordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
