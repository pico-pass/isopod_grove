import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GameState, GameStateDocument } from '../game-state/schemas/game-state.schema';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { SpeciesService } from '../species/species.service';
import {
  SOIL_RATE_BONUS_PER_LEVEL,
  getLevel,
  isComfortable,
} from '../game-state/game-engine';

const LEADERBOARD_LIMIT = 20;

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  isMe: boolean;
  value: number;
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
  ) {}

  async getLevelLeaderboard(requesterId: string): Promise<LeaderboardResult> {
    const states = await this.gameStateModel
      .find({}, { userId: 1, xp: 1 })
      .lean<Pick<LeanGameState, 'userId' | 'xp'>[]>();

    const sorted = [...states].sort((a, b) => b.xp - a.xp);
    return this.buildResult(
      sorted.map((s) => ({ userId: s.userId, value: getLevel(s.xp) })),
      requesterId,
    );
  }

  async getPvpLeaderboard(requesterId: string): Promise<LeaderboardResult> {
    const states = await this.gameStateModel
      .find({}, { userId: 1, pvpRating: 1 })
      .lean<{ userId: Types.ObjectId; pvpRating: number }[]>();

    const sorted = [...states].sort((a, b) => b.pvpRating - a.pvpRating);
    return this.buildResult(
      sorted.map((s) => ({ userId: s.userId, value: s.pvpRating })),
      requesterId,
    );
  }

  async getIncomeLeaderboard(requesterId: string): Promise<LeaderboardResult> {
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

    return this.buildResult(sorted, requesterId);
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
    ranked: { userId: Types.ObjectId; value: number }[],
    requesterId: string,
  ): Promise<LeaderboardResult> {
    const top = ranked.slice(0, LEADERBOARD_LIMIT);
    const requesterIndex = ranked.findIndex(
      (r) => r.userId.toString() === requesterId,
    );

    const neededIds = new Set(top.map((r) => r.userId.toString()));
    if (requesterIndex >= 0) neededIds.add(requesterId);
    const users = await this.usersService.findByIds([...neededIds]);
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    const toEntry = (
      r: { userId: Types.ObjectId; value: number },
      rank: number,
    ): LeaderboardEntry => {
      const id = r.userId.toString();
      const user = userById.get(id);
      return {
        rank,
        userId: id,
        displayName: user ? effectiveDisplayName(user) : '알 수 없음',
        avatarUrl: user?.avatarUrl,
        isMe: id === requesterId,
        value: r.value,
      };
    };

    const entries = top.map((r, i) => toEntry(r, i + 1));
    const me =
      requesterIndex >= 0
        ? {
            ...toEntry(ranked[requesterIndex], requesterIndex + 1),
            inTop: requesterIndex < LEADERBOARD_LIMIT,
          }
        : null;

    return { entries, me };
  }
}
