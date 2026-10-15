import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PuzzleRecordDocument = HydratedDocument<PuzzleRecord>;

// 오늘의 퍼즐 기록. 유저가 그날 단계마다 깬 가장 적은 이동 수를 하루에 한 건씩 저장한다(순위의 기준).
// 지난 날의 기록은 바뀌지 않는다(그날이 지나면 제출을 받지 않는다). 오래된 기록은 TTL 인덱스가 지운다.
// 단계가 생기기 전(하루 한 판이던 때)의 기록은 cleared가 없어서 순위에서 빠진다.
@Schema({ collection: 'puzzle_records' })
export class PuzzleRecord {
  @Prop({ required: true })
  dayKey: string; // 퍼즐 날짜(YYYY-MM-DD, 한국 시간)

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  // 단계별 최소 이동 수(인덱스 = 단계 - 1, 0이면 아직 못 깸). 앞 단계를 깨야 다음 단계를 풀 수 있어서 중간이 비는 일은 없다.
  @Prop({ type: [Number], default: [] })
  stageBest: number[];

  // 오늘 이어서 깬 단계 수와, 깬 단계들의 최단 수 초과분 합(순위 기준: 많이 깬 순 → 초과분이 적은 순)
  @Prop({ default: 0 })
  cleared: number;

  @Prop({ default: 0 })
  excess: number;

  // 위 성적이 마지막으로 좋아진 시각(같은 성적끼리 먼저 달성한 사람을 앞에 보여주는 데만 쓴다. 순위 번호는 같다)
  @Prop({ type: Date, default: null })
  reachedAt: Date | null;

  // 깬 횟수(검증을 통과한 제출 수)
  @Prop({ default: 0 })
  solves: number;

  @Prop({ type: Date, required: true })
  expireAt: Date;
}

export const PuzzleRecordSchema = SchemaFactory.createForClass(PuzzleRecord);
PuzzleRecordSchema.index({ dayKey: 1, userId: 1 }, { unique: true });
PuzzleRecordSchema.index({ dayKey: 1, cleared: -1, excess: 1, reachedAt: 1 });
PuzzleRecordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
