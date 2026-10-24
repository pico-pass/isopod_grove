import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WeatherLog, WeatherLogDocument } from '../weather/schemas/weather-log.schema';
import type { WeatherType } from '../weather/weather.data';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { DUNGEON_DIFFICULTIES, dungeonScore, type DungeonDifficultyId } from './dungeon-engine';
import { ForestEvent, ForestEventDocument, NewsEdition, NewsEditionDocument } from './schemas/forest-event.schema';
import { PuzzleRecord, PuzzleRecordDocument } from './schemas/puzzle-record.schema';
import { RunnerRecord, RunnerRecordDocument } from './schemas/runner-record.schema';
import { StackRecord, StackRecordDocument } from './schemas/stack-record.schema';
import { QuizRecord, QuizRecordDocument } from './schemas/quiz-record.schema';
import { ShopSimRecord, ShopSimRecordDocument } from './schemas/shop-sim.schema';
import { getPuzzleDayKey, getPuzzleResetAt } from './puzzle-engine';
import { buildNewsArticles, type NewsArticle, type NewsInput } from './news-engine';
import { AuctionLot, AuctionLotDocument } from './schemas/auction.schema';
import { auctionItemInfo } from './auction.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 어제 날짜 문자열(YYYY-MM-DD, 한국 시간)
export function previousDayKey(dayKey: string): string {
  return new Date(Date.parse(`${dayKey}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

// 그 한국 날짜의 시작·끝 시각(ms)
export function dayRangeMs(dayKey: string): { from: number; to: number } {
  const from = Date.parse(`${dayKey}T00:00:00Z`) - KST_OFFSET_MS;
  return { from, to: from + DAY_MS };
}

// 숲 신문: 규칙은 news-engine.ts. 하루에 한 호를 그날 처음 읽는 사람이 있을 때 어제의 기록으로 만들어 저장한다.
@Injectable()
export class NewsService {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(NewsEdition.name) private readonly editions: Model<NewsEditionDocument>,
    @InjectModel(ForestEvent.name) private readonly events: Model<ForestEventDocument>,
    @InjectModel(WeatherLog.name) private readonly weatherLogs: Model<WeatherLogDocument>,
    @InjectModel(PuzzleRecord.name) private readonly puzzles: Model<PuzzleRecordDocument>,
    @InjectModel(RunnerRecord.name) private readonly runners: Model<RunnerRecordDocument>,
    @InjectModel(StackRecord.name) private readonly stacks: Model<StackRecordDocument>,
    @InjectModel(QuizRecord.name) private readonly quizzes: Model<QuizRecordDocument>,
    @InjectModel(ShopSimRecord.name) private readonly shops: Model<ShopSimRecordDocument>,
    // 어제의 경매 낙찰 결과(끝자리 옵션이라 없어도 신문은 나온다)
    @InjectModel(AuctionLot.name) private readonly auctionLots?: Model<AuctionLotDocument>,
  ) {}

  private async names(ids: (Types.ObjectId | string)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.map((i) => i.toString()))];
    if (unique.length === 0) return new Map();
    const users = await this.usersService.findByIds(unique);
    return new Map(users.map((u) => [u._id.toString(), effectiveDisplayName(u)]));
  }

  // 어제의 자료를 모은다
  async gather(dayKey: string): Promise<NewsInput> {
    const yesterday = previousDayKey(dayKey);
    const range = dayRangeMs(yesterday);
    const [logs, rareEvents, dungeonEvents, wantedEvents, puzzleRows, runnerRows, stackRows, quizRows, shopRows] = await Promise.all([
      this.weatherLogs.find({ at: { $gte: range.from, $lt: range.to } }, { type: 1, tempC: 1 }).lean<{ type: string; tempC: number }[]>(),
      this.events.find({ day: yesterday, type: 'rare' }).lean<{ userId: Types.ObjectId; data: { speciesName?: string; rarity?: number; via?: string }; at: number }[]>(),
      this.events.find({ day: yesterday, type: 'dungeon' }).lean<{ userId: Types.ObjectId; data: { difficulty?: string; floors?: number; cleared?: boolean } }[]>(),
      this.events.find({ day: yesterday, type: 'wanted' }).lean<{ userId: Types.ObjectId }[]>(),
      this.puzzles.find({ dayKey: yesterday, cleared: { $gte: 1 } }).sort({ cleared: -1, excess: 1, reachedAt: 1 }).lean<{ userId: Types.ObjectId; cleared: number; excess: number }[]>(),
      this.runners.find({ dayKey: yesterday }).sort({ bestMeters: -1, bestAt: 1 }).lean<{ userId: Types.ObjectId; bestMeters: number }[]>(),
      this.stacks.find({ dayKey: yesterday }).sort({ bestHeight: -1, bestAt: 1 }).lean<{ userId: Types.ObjectId; bestHeight: number }[]>(),
      this.quizzes.find({ dayKey: yesterday }).sort({ bestStreak: -1, bestAt: 1 }).lean<{ userId: Types.ObjectId; bestStreak: number }[]>(),
      this.shops.find({ dayKey: yesterday }).sort({ efficiency: -1, profit: -1, playedAt: 1 }).lean<{ userId: Types.ObjectId; efficiency: number }[]>(),
    ]);

    // 어제 가장 많이 관측된 날씨와 기온 범위
    const counts = new Map<string, number>();
    for (const l of logs) counts.set(l.type, (counts.get(l.type) ?? 0) + 1);
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as WeatherType | undefined;
    const temps = logs.map((l) => l.tempC).filter((t) => Number.isFinite(t));

    // 전설·신화 발견은 희귀도 높은 순 → 먼저 일어난 순
    const rare = [...rareEvents].sort((a, b) => (b.data.rarity ?? 0) - (a.data.rarity ?? 0) || a.at - b.at).slice(0, 8);
    // 던전은 난이도·층 기록이 가장 높은 한 건
    const bestDungeon = [...dungeonEvents].sort((a, b) => dungeonScore((b.data.difficulty ?? 'easy') as DungeonDifficultyId, b.data.floors ?? 0) - dungeonScore((a.data.difficulty ?? 'easy') as DungeonDifficultyId, a.data.floors ?? 0))[0];

    const auctionRows = this.auctionLots
      ? await this.auctionLots.find({ day: yesterday, top: { $ne: null } }).sort({ lot: 1 }).lean<{ lot: number; kind: string; itemId: string; boostHours: number; top: { userId: Types.ObjectId; amount: number } }[]>()
      : [];
    const nameMap = await this.names([...rare.map((r) => r.userId), ...(bestDungeon ? [bestDungeon.userId] : []), ...wantedEvents.map((w) => w.userId), ...auctionRows.map((a) => a.top.userId), ...[puzzleRows[0], runnerRows[0], stackRows[0], quizRows[0], shopRows[0]].filter(Boolean).map((r) => r!.userId)]);
    const nameOf = (id: Types.ObjectId) => nameMap.get(id.toString()) ?? '숲지기';

    return {
      dayKey,
      yesterday,
      weather: { dominant: dominant ?? null, maxTempC: temps.length ? Math.max(...temps) : null, minTempC: temps.length ? Math.min(...temps) : null },
      rare: rare.map((r) => ({ userName: nameOf(r.userId), speciesName: r.data.speciesName ?? '콩벌레', rarity: r.data.rarity ?? 3, via: r.data.via ?? 'explore' })),
      dungeon: bestDungeon ? { userName: nameOf(bestDungeon.userId), difficultyName: (DUNGEON_DIFFICULTIES.find((d) => d.id === bestDungeon.data.difficulty) ?? DUNGEON_DIFFICULTIES[0]).name, floors: bestDungeon.data.floors ?? 0, cleared: bestDungeon.data.cleared === true } : null,
      dungeonRuns: dungeonEvents.length,
      wantedGold: wantedEvents.map((w) => nameOf(w.userId)),
      puzzle: puzzleRows[0] ? { userName: nameOf(puzzleRows[0].userId), cleared: puzzleRows[0].cleared, excess: puzzleRows[0].excess } : null,
      puzzleParticipants: puzzleRows.length,
      runner: runnerRows[0] && runnerRows[0].bestMeters > 0 ? { userName: nameOf(runnerRows[0].userId), meters: runnerRows[0].bestMeters } : null,
      runnerParticipants: runnerRows.length,
      stack: stackRows[0] && stackRows[0].bestHeight > 0 ? { userName: nameOf(stackRows[0].userId), height: stackRows[0].bestHeight } : null,
      stackParticipants: stackRows.length,
      quiz: quizRows[0] && quizRows[0].bestStreak > 0 ? { userName: nameOf(quizRows[0].userId), streak: quizRows[0].bestStreak } : null,
      quizParticipants: quizRows.length,
      shop: shopRows[0] ? { userName: nameOf(shopRows[0].userId), efficiency: shopRows[0].efficiency } : null,
      shopParticipants: shopRows.length,
      auction: auctionRows.map((a) => {
        const info = auctionItemInfo(a.kind, a.itemId, a.boostHours);
        return { name: info.name, icon: info.icon, userName: nameOf(a.top.userId), amount: a.top.amount };
      }),
    };
  }

  // 오늘 호를 돌려준다. 아직 안 만들었으면 만들어서 저장하고, 동시에 만든 쪽이 있으면 먼저 저장된 호를 쓴다.
  async today(now = Date.now()) {
    const dayKey = getPuzzleDayKey(now);
    let edition = await this.editions.findOne({ dayKey }).lean<{ articles: NewsArticle[] }>();
    if (!edition) {
      const articles = buildNewsArticles(await this.gather(dayKey));
      const expireAt = new Date(getPuzzleResetAt(dayKey) + 14 * DAY_MS);
      edition = await this.editions
        .findOneAndUpdate({ dayKey }, { $setOnInsert: { articles, expireAt } }, { upsert: true, returnDocument: 'after' })
        .lean<{ articles: NewsArticle[] }>();
    }
    const articles = (edition?.articles ?? []) as NewsArticle[];
    return { dayKey, yesterday: previousDayKey(dayKey), headline: articles[0] ?? null, articles };
  }
}
