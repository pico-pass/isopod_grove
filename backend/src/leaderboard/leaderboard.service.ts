import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GameState, GameStateDocument } from '../game-state/schemas/game-state.schema';
import { PuzzleRecord, PuzzleRecordDocument } from '../game-state/schemas/puzzle-record.schema';
import { RunnerRecord, RunnerRecordDocument } from '../game-state/schemas/runner-record.schema';
import { PUZZLE_STAGES, getPuzzleDayKey, rankByLadder } from '../game-state/puzzle-engine';
import { rankByDistance } from '../game-state/runner-engine';
import { describeDungeonScore, normalizeDungeonScore, rankDungeon } from '../game-state/dungeon-engine';
import { TerrariumLike, TerrariumLikeDocument } from '../visit/schemas/terrarium-like.schema';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { SpeciesService } from '../species/species.service';
import {
  BOSS_DIFFICULTIES,
  BOSS_PROGRESS_FIELD,
  SOIL_RATE_BONUS_PER_LEVEL,
  getBossEffectiveFloor,
  getBossProgress,
  getLevel,
  isComfortable,
} from '../game-state/game-engine';

// 랭킹에서 볼 수 있는 인원 수 선택지(기본은 20명). 화면에서 20·50·100명 중에 고른다.
export const LEADERBOARD_LIMITS = [20, 50, 100] as const;
export const DEFAULT_LEADERBOARD_LIMIT = 20;

// ?limit= 값을 선택지 안의 숫자로 바꾼다. 없거나 선택지에 없는 값이면 기본값이다.
export function parseLeaderboardLimit(raw: unknown): number {
  const n = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return (LEADERBOARD_LIMITS as readonly number[]).includes(n) ? n : DEFAULT_LEADERBOARD_LIMIT;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  isMe: boolean;
  value: number;
  // 값 대신 보여줄 문구(보스 타워의 "어려움 12층" 같은 것). 없으면 화면이 value로 만든다.
  label?: string;
  // 그 기록을 세운 콩벌레(콩 달리기 순위). 그림과 이름, 희귀도를 화면이 그대로 그린다.
  species?: LeaderboardSpecies;
}

export interface LeaderboardSpecies {
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  rarity: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  me: (LeaderboardEntry & { inTop: boolean }) | null;
}

// game_state를 population/breeding까지 lean()으로 읽으면 Map 필드가 일반 객체로 내려온다.
interface LeanTerrarium {
  spaceLevel: number;
  food: number;
  humidity: number;
  temperature: number;
  population: Record<string, number>;
}
interface LeanGameState {
  userId: Types.ObjectId;
  xp: number;
  terrariums: LeanTerrarium[];
  upgrades: Record<string, number>;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(GameState.name)
    private gameStateModel: Model<GameStateDocument>,
    private readonly usersService: UsersService,
    private readonly speciesService: SpeciesService,
    // 오늘의 퍼즐 순위 전용. 끝자리에 둬서 기존 테스트 생성자 호출(3개 인자)이 깨지지 않게 한다.
    @InjectModel(PuzzleRecord.name)
    private puzzleRecordModel?: Model<PuzzleRecordDocument>,
    // 콩 달리기 순위 전용(역시 끝자리).
    @InjectModel(RunnerRecord.name)
    private runnerRecordModel?: Model<RunnerRecordDocument>,
    // 사육장 좋아요 순위 전용(역시 끝자리).
    @InjectModel(TerrariumLike.name)
    private terrariumLikeModel?: Model<TerrariumLikeDocument>,
  ) {}

  async getLevelLeaderboard(requesterId: string, limit = DEFAULT_LEADERBOARD_LIMIT): Promise<LeaderboardResult> {
    const states = await this.gameStateModel
      .find({}, { userId: 1, xp: 1 })
      .lean<Pick<LeanGameState, 'userId' | 'xp'>[]>();

    const sorted = [...states].sort((a, b) => b.xp - a.xp);
    return this.buildResult(
      sorted.map((s) => ({ userId: s.userId, value: getLevel(s.xp) })),
      requesterId,
      limit,
    );
  }

  // 오늘의 퍼즐: 오늘 많이 깬 단계 순, 같으면 깬 단계들의 최단 수 초과분이 적은 순. 같은 성적은 같은 순위(1, 1, 3)이고,
  // 같은 순위 안에서는 먼저 달성한 사람이 위에 보인다. 순위 번호가 겹치므로 줄 번호(index)가 아니라 계산한 순위를 그대로 쓴다.
  async getPuzzleLeaderboard(requesterId: string, limit = DEFAULT_LEADERBOARD_LIMIT): Promise<LeaderboardResult> {
    if (!this.puzzleRecordModel) throw new Error('PuzzleRecord 모델이 연결되지 않았어요.');
    const dayKey = getPuzzleDayKey();
    const records = await this.puzzleRecordModel
      .find({ dayKey, cleared: { $gte: 1 } }, { userId: 1, cleared: 1, excess: 1 })
      .sort({ cleared: -1, excess: 1, reachedAt: 1 })
      .lean<{ userId: Types.ObjectId; cleared: number; excess: number }[]>();
    const ranks = rankByLadder(records);
    return this.buildResult(
      records.map((r, i) => ({
        userId: r.userId,
        value: r.cleared,
        rank: ranks[i],
        label: `${r.cleared}/${PUZZLE_STAGES}단계 · 초과 +${r.excess}수`,
      })),
      requesterId,
      limit,
    );
  }

  // 콩 달리기: 오늘 가장 멀리 달린 순. 같은 거리는 같은 순위(1, 1, 3)이고, 같은 순위 안에서는 먼저 달성한 사람이 위에 보인다.
  async getRunnerLeaderboard(requesterId: string, limit = DEFAULT_LEADERBOARD_LIMIT): Promise<LeaderboardResult> {
    if (!this.runnerRecordModel) throw new Error('RunnerRecord 모델이 연결되지 않았어요.');
    const dayKey = getPuzzleDayKey();
    const records = await this.runnerRecordModel
      .find({ dayKey }, { userId: 1, bestMeters: 1, speciesId: 1 })
      .sort({ bestMeters: -1, bestAt: 1 })
      .lean<{ userId: Types.ObjectId; bestMeters: number; speciesId?: string }[]>();
    const ranks = rankByDistance(records.map((r) => r.bestMeters));
    // 기록을 세운 콩벌레도 함께 내려준다(희귀도마다 능력이 달라서 어떤 종으로 달렸는지가 중요하다). 종 정보가 없는 옛 기록은 거리만.
    const speciesById = new Map((await this.speciesService.findAll()).map((s) => [s.speciesId, s]));
    return this.buildResult(
      records.map((r, i) => {
        const sp = r.speciesId ? speciesById.get(r.speciesId) : undefined;
        return {
          userId: r.userId,
          value: r.bestMeters,
          rank: ranks[i],
          label: `${r.bestMeters.toLocaleString('ko-KR')}m`,
          ...(sp ? { species: { speciesId: sp.speciesId, name: sp.name, image: sp.image, filter: sp.filter, rarity: sp.rarity } } : {}),
        };
      }),
      requesterId,
      limit,
    );
  }

  // 인기 사육장: 받은 좋아요(모든 사육장 합계)가 많은 순. 같은 개수는 같은 순위(1, 1, 3)이고, 같은 순위 안에서는 먼저 그 개수에
  // 닿은 사람이 위에 보인다. 사육장을 비공개로 해 둔 유저는 순위에서 뺀다(눌러도 방문할 수 없으므로).
  async getLikesLeaderboard(requesterId: string, limit = DEFAULT_LEADERBOARD_LIMIT): Promise<LeaderboardResult> {
    if (!this.terrariumLikeModel) throw new Error('TerrariumLike 모델이 연결되지 않았어요.');
    const rows = await this.terrariumLikeModel.aggregate<{ _id: Types.ObjectId; n: number; last: number }>([
      { $group: { _id: '$ownerId', n: { $sum: 1 }, last: { $max: '$createdAt' } } },
    ]);
    const states = await this.gameStateModel
      .find({ userId: { $in: rows.map((r) => r._id) } }, { userId: 1, terrariumPublic: 1 })
      .lean<{ userId: Types.ObjectId; terrariumPublic?: boolean }[]>();
    const hidden = new Set(states.filter((s) => s.terrariumPublic === false).map((s) => s.userId.toString()));
    const ranked = rows
      .filter((r) => !hidden.has(r._id.toString()))
      .sort((a, b) => b.n - a.n || a.last - b.last || a._id.toString().localeCompare(b._id.toString()));
    const ranks = rankByDistance(ranked.map((r) => r.n));
    return this.buildResult(
      ranked.map((r, i) => ({ userId: r._id, value: r.n, rank: ranks[i], label: `❤️ ${r.n.toLocaleString('ko-KR')}` })),
      requesterId,
      limit,
    );
  }

  // 던전: 가장 높이 오른 기록(난이도 → 층) 순, 같으면 완주 횟수가 많은 순. 한 번도 못 올라간 유저는 순위에 올리지 않는다.
  async getDungeonLeaderboard(requesterId: string, limit = DEFAULT_LEADERBOARD_LIMIT): Promise<LeaderboardResult> {
    const states = await this.gameStateModel
      .find({ 'stats.dungeonBestScore': { $gt: 0 } }, { userId: 1, 'stats.dungeonBestScore': 1, 'stats.dungeonClears': 1 })
      .lean<{ userId: Types.ObjectId; stats?: { dungeonBestScore?: number; dungeonClears?: number } }[]>();
    const rows = states
      .map((s) => ({ userId: s.userId, bestScore: normalizeDungeonScore(s.stats?.dungeonBestScore), clears: s.stats?.dungeonClears ?? 0 }))
      .filter((r) => r.bestScore > 0)
      .sort((a, b) => b.bestScore - a.bestScore || b.clears - a.clears);
    const ranks = rankDungeon(rows);
    return this.buildResult(
      rows.map((r, i) => ({ userId: r.userId, value: r.bestScore, rank: ranks[i], label: `${describeDungeonScore(r.bestScore)}${r.clears > 0 ? ` · 완주 ${r.clears}회` : ''}` })),
      requesterId,
      limit,
    );
  }

  async getPvpLeaderboard(requesterId: string, limit = DEFAULT_LEADERBOARD_LIMIT): Promise<LeaderboardResult> {
    const states = await this.gameStateModel
      .find({}, { userId: 1, pvpRating: 1 })
      .lean<{ userId: Types.ObjectId; pvpRating: number }[]>();

    const sorted = [...states].sort((a, b) => b.pvpRating - a.pvpRating);
    return this.buildResult(
      sorted.map((s) => ({ userId: s.userId, value: s.pvpRating })),
      requesterId,
      limit,
    );
  }

  // 보스 타워 기록. 난이도마다 깬 층이 따로라서, 능력치 배율을 층으로 환산한 "난이도 환산 층"으로 줄을 세우고
  // 화면에는 그 사람의 가장 높은 기록을 "어려움 12층"처럼 보여준다. 한 번도 안 깬 유저는 순위에 올리지 않는다.
  async getBossLeaderboard(requesterId: string, limit = DEFAULT_LEADERBOARD_LIMIT): Promise<LeaderboardResult> {
    const projection: Record<string, 1> = { userId: 1 };
    for (const field of Object.values(BOSS_PROGRESS_FIELD)) projection[`stats.${field}`] = 1;
    const states = await this.gameStateModel
      .find({}, projection)
      .lean<{ userId: Types.ObjectId; stats?: Parameters<typeof getBossProgress>[0] }[]>();

    const ranked = states
      .map((s) => {
        let best: { value: number; label: string } | null = null;
        for (const d of BOSS_DIFFICULTIES) {
          const floor = getBossProgress(s.stats, d.id);
          if (floor <= 0) continue;
          const value = getBossEffectiveFloor(floor, d.id);
          if (!best || value > best.value) best = { value, label: `${d.name} ${floor}층` };
        }
        return best ? { userId: s.userId, ...best } : null;
      })
      .filter((r): r is { userId: Types.ObjectId; value: number; label: string } => r !== null)
      .sort((a, b) => b.value - a.value);
    return this.buildResult(ranked, requesterId, limit);
  }

  // 서바이벌 최고 스테이지. 한 번도 도달하지 못한(0) 유저는 순위에 올리지 않는다.
  async getSurvivalLeaderboard(requesterId: string, limit = DEFAULT_LEADERBOARD_LIMIT): Promise<LeaderboardResult> {
    const states = await this.gameStateModel
      .find({}, { userId: 1, 'stats.highestSurvivalStage': 1 })
      .lean<{ userId: Types.ObjectId; stats?: { highestSurvivalStage?: number } }[]>();
    const ranked = states
      .map((s) => ({ userId: s.userId, value: s.stats?.highestSurvivalStage || 0 }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
    return this.buildResult(ranked, requesterId, limit);
  }

  async getIncomeLeaderboard(requesterId: string, limit = DEFAULT_LEADERBOARD_LIMIT): Promise<LeaderboardResult> {
    const speciesList = await this.speciesService.findAll();
    const rateById = new Map(speciesList.map((s) => [s.speciesId, s.rate]));

    const states = await this.gameStateModel
      .find({}, { userId: 1, terrariums: 1, upgrades: 1 })
      .lean<LeanGameState[]>();

    const sorted = states
      .map((s) => ({
        userId: s.userId,
        value: Math.round(this.incomePerSecond(s, rateById) * 60),
      }))
      .sort((a, b) => b.value - a.value);

    return this.buildResult(sorted, requesterId, limit);
  }

  // 사육장마다 환경(먹이/습도/온도)에 따른 쾌적 여부를 반영해 초당 수익을 더한다.
  // (game-state.service.ts의 advance() 계산 로직과 동일한 공식을 쓴다.)
  private incomePerSecond(
    state: LeanGameState,
    rateById: Map<string, number>,
  ): number {
    const soilLevel = state.upgrades?.soil || 0;
    let perSecond = 0;
    for (const terrarium of state.terrariums || []) {
      const comfortable = isComfortable(
        terrarium.food,
        terrarium.humidity,
        terrarium.temperature,
      );
      let base = 0;
      for (const [speciesId, count] of Object.entries(
        terrarium.population || {},
      )) {
        const rate = rateById.get(speciesId);
        if (rate) base += count * rate;
      }
      perSecond +=
        base *
        (1 + soilLevel * SOIL_RATE_BONUS_PER_LEVEL) *
        (comfortable ? 1 : 0.4);
    }
    return perSecond;
  }

  private async buildResult(
    ranked: { userId: Types.ObjectId; value: number; label?: string; rank?: number; species?: LeaderboardSpecies }[],
    requesterId: string,
    limit = DEFAULT_LEADERBOARD_LIMIT,
  ): Promise<LeaderboardResult> {
    const top = ranked.slice(0, limit);
    const requesterIndex = ranked.findIndex(
      (r) => r.userId.toString() === requesterId,
    );

    const neededIds = new Set(top.map((r) => r.userId.toString()));
    if (requesterIndex >= 0) neededIds.add(requesterId);
    const users = await this.usersService.findByIds([...neededIds]);
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    const toEntry = (
      r: { userId: Types.ObjectId; value: number; label?: string; rank?: number; species?: LeaderboardSpecies },
      fallbackRank: number,
    ): LeaderboardEntry => {
      const rank = r.rank ?? fallbackRank;
      const id = r.userId.toString();
      const user = userById.get(id);
      return {
        rank,
        userId: id,
        displayName: user ? effectiveDisplayName(user) : '알 수 없음',
        avatarUrl: user?.avatarUrl,
        isMe: id === requesterId,
        value: r.value,
        ...(r.label ? { label: r.label } : {}),
        ...(r.species ? { species: r.species } : {}),
      };
    };

    const entries = top.map((r, i) => toEntry(r, i + 1));
    const me =
      requesterIndex >= 0
        ? {
            ...toEntry(ranked[requesterIndex], requesterIndex + 1),
            inTop: requesterIndex < limit,
          }
        : null;

    return { entries, me };
  }
}
