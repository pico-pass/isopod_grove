import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RestorationEntry, RestorationEntryDocument, RestorationWeek, RestorationWeekDocument } from './schemas/restoration.schema';
import { RESTORATION_DAILY_CAP, restorationGoal, type RestorationKind } from './restoration-engine';
import { previousWeekKeyOf, weekKeyOf } from './underdog-engine';
import { getPuzzleDayKey } from './puzzle-engine';

export type LeanRestorationWeek = { _id: Types.ObjectId; weekKey: string; goal: number; points: number; contributors: number; explores: number; expeditions: number; battles: number; dungeons: number };
export type LeanRestorationEntry = { _id: Types.ObjectId; weekKey: string; userId: Types.ObjectId; points: number; dayKey: string; dayPoints: number; claimed: string[] };

const COUNTER_OF: Record<RestorationKind, 'explores' | 'expeditions' | 'battles' | 'dungeons'> = {
  explore: 'explores',
  expedition: 'expeditions',
  battle: 'battles',
  dungeon: 'dungeons',
};
const WEEK_KEEP_MS = 70 * 24 * 60 * 60 * 1000;

// 숲 복원 게이지에 점수를 쌓는 일과 주간 기록 읽기. 다른 서비스를 쓰지 않아서(모델만 쓴다) GameStateService가 안전하게 불러 쓸 수 있다.
@Injectable()
export class RestorationLedger {
  constructor(
    @InjectModel(RestorationWeek.name) private readonly weeks: Model<RestorationWeekDocument>,
    @InjectModel(RestorationEntry.name) private readonly entries: Model<RestorationEntryDocument>,
  ) {}

  // 그 주의 게이지를 돌려준다. 아직 없으면 지난 주 기록으로 목표를 정해서 만든다.
  async ensureWeek(weekKey: string, now = Date.now()): Promise<LeanRestorationWeek> {
    const found = await this.weeks.findOne({ weekKey }).lean<LeanRestorationWeek>();
    if (found) return found;
    const prev = await this.weeks.findOne({ weekKey: previousWeekKeyOf(now) }).lean<LeanRestorationWeek>();
    const goal = restorationGoal(prev ? { points: prev.points, contributors: prev.contributors } : null);
    try {
      const created = await this.weeks
        .findOneAndUpdate({ weekKey }, { $setOnInsert: { goal, points: 0, contributors: 0, explores: 0, expeditions: 0, battles: 0, dungeons: 0, expireAt: new Date(now + WEEK_KEEP_MS) } }, { upsert: true, returnDocument: 'after' })
        .lean<LeanRestorationWeek>();
      if (created) return created;
    } catch {
      // 동시에 만든 쪽이 있으면 아래에서 다시 읽는다
    }
    return (await this.weeks.findOne({ weekKey }).lean<LeanRestorationWeek>())!;
  }

  async getWeek(weekKey: string): Promise<LeanRestorationWeek | null> {
    return this.weeks.findOne({ weekKey }).lean<LeanRestorationWeek>();
  }

  async myEntry(userId: string, weekKey: string): Promise<LeanRestorationEntry | null> {
    return this.entries.findOne({ weekKey, userId: new Types.ObjectId(userId) }).lean<LeanRestorationEntry>();
  }

  async topEntries(weekKey: string, limit: number): Promise<LeanRestorationEntry[]> {
    return this.entries.find({ weekKey, points: { $gt: 0 } }).sort({ points: -1, updatedAt: 1 }).limit(limit).lean<LeanRestorationEntry[]>();
  }

  private async upsertEntry(weekKey: string, userId: Types.ObjectId): Promise<LeanRestorationEntry> {
    const filter = { weekKey, userId };
    try {
      const doc = await this.entries
        .findOneAndUpdate(filter, { $setOnInsert: { points: 0, dayKey: '', dayPoints: 0, claimed: [] } }, { upsert: true, returnDocument: 'after' })
        .lean<LeanRestorationEntry>();
      if (doc) return doc;
    } catch {
      // 동시에 만든 쪽이 있으면 아래에서 다시 읽는다
    }
    return (await this.entries.findOne(filter).lean<LeanRestorationEntry>())!;
  }

  // 보상을 "받음"으로 표시한다. 이미 받았으면 false(두 번 눌러도 한 번만 받는다). 그 주 기록이 없으면 만들면서 표시한다.
  async markClaimed(userId: string, weekKey: string, id: string): Promise<boolean> {
    try {
      const res = await this.entries.updateOne({ weekKey, userId: new Types.ObjectId(userId), claimed: { $ne: id } }, { $addToSet: { claimed: id } }, { upsert: true });
      return res.modifiedCount > 0 || res.upsertedCount > 0;
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return false; // 이미 받은 기록이 있는 문서에 upsert가 부딪힌 경우
      throw e;
    }
  }

  // 점수를 쌓고 실제로 쌓인 점수(하루 상한을 넘으면 깎임)를 돌려준다. 행동 횟수는 상한과 상관없이 센다.
  async add(userId: string, kind: RestorationKind, points: number, now = Date.now()): Promise<number> {
    if (!(points > 0)) return 0;
    const weekKey = weekKeyOf(now);
    const day = getPuzzleDayKey(now);
    await this.ensureWeek(weekKey, now);
    const uid = new Types.ObjectId(userId);
    let gained = 0;
    let first = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      const entry = await this.upsertEntry(weekKey, uid);
      const dayPoints = entry.dayKey === day ? entry.dayPoints : 0;
      gained = Math.max(0, Math.min(Math.floor(points), RESTORATION_DAILY_CAP - dayPoints));
      if (gained === 0) break;
      // 읽은 뒤에 같은 사람의 다른 요청이 끼어들면 조건이 맞지 않아 갱신되지 않으므로(상한을 넘지 않는다) 다시 읽어서 한다
      const res =
        entry.dayKey === day
          ? await this.entries.updateOne({ _id: entry._id, dayKey: day, dayPoints: { $lte: RESTORATION_DAILY_CAP - gained } }, { $inc: { points: gained, dayPoints: gained } })
          : await this.entries.updateOne({ _id: entry._id, dayKey: entry.dayKey }, { $set: { dayKey: day, dayPoints: gained }, $inc: { points: gained } });
      if (res.matchedCount > 0) {
        first = entry.points === 0;
        break;
      }
      gained = 0; // 그 사이에 바뀌었으면 다시 읽어서 한 번 더
    }
    await this.weeks.updateOne({ weekKey }, { $inc: { points: gained, [COUNTER_OF[kind]]: 1, ...(first && gained > 0 ? { contributors: 1 } : {}) } });
    return gained;
  }
}
