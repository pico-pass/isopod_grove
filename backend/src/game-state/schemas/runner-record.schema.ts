import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RunnerRecordDocument = HydratedDocument<RunnerRecord>;

// 콩 달리기 기록. 유저가 그날 가장 멀리 달린 거리를 하루에 한 건씩 저장한다(순위의 기준). 오래된 기록은 TTL 인덱스가 지운다.
@Schema({ collection: 'runner_records' })
export class RunnerRecord {
  @Prop({ required: true })
  dayKey: string; // 날짜(YYYY-MM-DD, 한국 시간)

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  bestMeters: number;

  // 그 기록을 처음 세운 시각(같은 거리끼리 먼저 달성한 사람을 앞에 보여주는 데만 쓴다. 순위 번호는 같다)
  @Prop({ type: Date, required: true })
  bestAt: Date;

  // 그 기록을 세운 콩벌레(종). 순위에 함께 보여준다. 능력 때문에 희귀도에 따라 기록이 달라지기 때문이다.
  @Prop({ default: '' })
  speciesId: string;

  // 그날 끝까지 달린(검증을 통과한) 횟수
  @Prop({ default: 1 })
  runs: number;

  @Prop({ type: Date, required: true })
  expireAt: Date;
}

export const RunnerRecordSchema = SchemaFactory.createForClass(RunnerRecord);
RunnerRecordSchema.index({ dayKey: 1, userId: 1 }, { unique: true });
RunnerRecordSchema.index({ dayKey: 1, bestMeters: -1, bestAt: 1 });
RunnerRecordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
