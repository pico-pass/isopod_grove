import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type QuizRecordDocument = HydratedDocument<QuizRecord>;

// 이 콩 누구? 기록. 유저가 그날 가장 길게 이어서 맞힌 개수를 하루에 한 건씩 저장한다(순위의 기준). 오래된 기록은 TTL 인덱스가 지운다.
@Schema({ collection: 'quiz_records' })
export class QuizRecord {
  @Prop({ required: true })
  dayKey: string; // 날짜(YYYY-MM-DD, 한국 시간)

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  bestStreak: number;

  // 그 기록을 처음 세운 시각(같은 개수끼리 먼저 달성한 사람을 앞에 보여주는 데만 쓴다. 순위 번호는 같다)
  @Prop({ type: Date, required: true })
  bestAt: Date;

  // 그날 끝까지 풀어 본(기록된) 판 수
  @Prop({ default: 1 })
  runs: number;

  @Prop({ type: Date, required: true })
  expireAt: Date;
}

export const QuizRecordSchema = SchemaFactory.createForClass(QuizRecord);
QuizRecordSchema.index({ dayKey: 1, userId: 1 }, { unique: true });
QuizRecordSchema.index({ dayKey: 1, bestStreak: -1, bestAt: 1 });
QuizRecordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
