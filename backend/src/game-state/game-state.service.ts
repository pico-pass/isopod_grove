import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import {
  GameState,
  GameStateDocument,
  Terrarium,
} from './schemas/game-state.schema';
import { SpeciesService } from '../species/species.service';
import { UpgradesService } from '../upgrades/upgrades.service';
import { QuestsService } from '../quests/quests.service';
import { AchievementsService } from '../achievements/achievements.service';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { RARITIES } from '../species/species.seed-data';
import { CareAction } from './dto/care.dto';
import {
  BATTLE_ACCOUNT_XP_BY_RARITY,
  BATTLE_COOLDOWN_MS,
  BATTLE_DIAMOND_CHANCE_BY_RARITY,
  BATTLE_LOSE_XP,
  BATTLE_REWARD_BY_RARITY,
  BATTLE_SPECIES_LOSE_XP_RATIO,
  BATTLE_SPECIES_XP_BY_RARITY,
  CARE_COOLDOWN_MS,
  DIAMONDS_PER_LEVEL,
  EXPLORE_COST,
  EXPLORE_TICKET_PRICE,
  EXPLORE_YIELD,
  MAX_FREE_EXPLORE_TICKETS,
  FEEDER_REFILL_TARGET,
  FEEDER_REFILL_THRESHOLD,
  MAX_ADVANCE_SECONDS,
  MAX_TERRARIUMS,
  MISTER_REFILL_TARGET,
  MISTER_REFILL_THRESHOLD,
  NEW_SPECIES_DIAMONDS_BY_RARITY,
  NICKNAME_CHANGE_COST,
  OBSERVE_COOLDOWN_MS,
  OBSERVE_REWARD,
  PVP_COOLDOWN_MS,
  PVP_LOSE_ACCOUNT_XP,
  PVP_MATCH_RATING_BANDS,
  PVP_RATING_LOSE_DELTA,
  PVP_RATING_WIN_DELTA,
  PVP_WIN_ACCOUNT_XP,
  PVP_WIN_COIN_REWARD,
  PVP_WIN_DIAMOND_CHANCE,
  PVP_WIN_SPECIES_XP,
  STEP_SECONDS,
  TRAIN_COOLDOWN_MS_BY_INTENSITY,
  TRAIN_EXTREME_DIAMOND_COST,
  TRAIN_EXTREME_XP_MULTIPLIER,
  TRAIN_XP_BY_INTENSITY,
  canBreedInEnvironment,
  clamp,
  getAchievementProgress,
  getAutoIncomeRate,
  getBaseBreedSeconds,
  getBattleLevel,
  getBattleLevelProgress,
  getBreedInterval,
  getCapacity,
  getLevel,
  getPopulationCount,
  getTerrariumCost,
  getTrainCost,
  isComfortable,
  pickRandomOfRarity,
  rollCombatStats,
  rollEnemyLevel,
  rollRarity,
  simulateBattle,
} from './game-engine';

interface LegacyGameState {
  food?: number;
  humidity?: number;
  temperature?: number;
  population?: Record<string, number>;
  breeding?: Record<string, number>;
  upgrades?: Record<string, number>;
}

const dayKey = (now = Date.now()) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

@Injectable()
export class GameStateService {
  constructor(
    @InjectModel(GameState.name)
    private gameStateModel: Model<GameStateDocument>,
    private readonly speciesService: SpeciesService,
    private readonly upgradesService: UpgradesService,
    private readonly questsService: QuestsService,
    private readonly achievementsService: AchievementsService,
    private readonly usersService: UsersService,
  ) {}

  // 경험치는 항상 이 메서드를 통해서만 더한다. 레벨이 오르면 다이아를 지급한다.
  private grantXp(gameState: GameStateDocument, amount: number) {
    const before = getLevel(gameState.xp);
    gameState.xp += amount;
    const after = getLevel(gameState.xp);
    if (after > before) {
      const diamonds = (after - before) * DIAMONDS_PER_LEVEL;
      gameState.diamonds += diamonds;
      this.pushLog(
        gameState,
        'diamond',
        `레벨 업! Lv. ${after} 달성으로 💎 ${diamonds}개를 받았어요.`,
      );
    }
  }

  findByUserId(userId: string): Promise<GameState | null> {
    return this.gameStateModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async createInitialState(userId: string): Promise<GameStateDocument> {
    return this.gameStateModel.create({
      userId: new Types.ObjectId(userId),
      terrariums: [
        {
          terrariumId: this.newTerrariumId(),
          name: '사육장 1',
          population: { pandaKing: 6 },
        },
      ],
      discovered: ['pandaKing'],
      daily: { day: dayKey(), feed: 0, observe: 0, births: 0, claimed: [] },
      logs: [
        {
          at: Date.now(),
          type: 'leaf',
          text: '쿠바리스 판다킹 6마리와 함께 작은 숲을 시작했어요.',
        },
      ],
    });
  }

  async findOrCreate(userId: string): Promise<GameStateDocument> {
    const existing = await this.getOrNull(userId);
    if (existing) return existing;
    return this.createInitialState(userId);
  }

  async advance(userId: string, seconds: number) {
    const gameState = await this.getOrThrow(userId);
    this.resetDailyIfNeeded(gameState);
    if (gameState.paused) {
      return { gameState, births: 0, earned: 0 };
    }

    const speciesList = await this.speciesService.findAll();
    const speciesById = new Map(speciesList.map((s) => [s.speciesId, s]));
    const soilLevel = gameState.upgrades.get('soil') || 0;
    const nurseryLevel = gameState.upgrades.get('nursery') || 0;
    const hasFeeder = (gameState.upgrades.get('feeder') || 0) > 0;
    const hasMister = (gameState.upgrades.get('mister') || 0) > 0;

    let remaining = clamp(seconds, 0, MAX_ADVANCE_SECONDS);
    let earned = 0;
    const babies = new Map<string, number>();

    while (remaining > 0) {
      const step = Math.min(remaining, STEP_SECONDS);
      remaining -= step;

      gameState.stats.played += step;
      const ambient = 24 + Math.sin(gameState.stats.played / 700) * 2.7;

      // 사육장마다 환경·수익·번식을 따로 계산한다.
      for (const terrarium of gameState.terrariums) {
        const count = getPopulationCount(terrarium.population);
        terrarium.food = clamp(
          terrarium.food - (0.015 + count * 0.0015) * step,
          0,
          100,
        );
        terrarium.humidity = clamp(terrarium.humidity - 0.023 * step, 0, 100);
        terrarium.temperature +=
          (ambient - terrarium.temperature) * Math.min(1, step * 0.002);

        if (hasFeeder && terrarium.food < FEEDER_REFILL_THRESHOLD) {
          terrarium.food = FEEDER_REFILL_TARGET;
        }
        if (hasMister && terrarium.humidity < MISTER_REFILL_THRESHOLD) {
          terrarium.humidity = MISTER_REFILL_TARGET;
        }

        const comfortable = isComfortable(
          terrarium.food,
          terrarium.humidity,
          terrarium.temperature,
        );
        const rate = getAutoIncomeRate(
          terrarium.population,
          speciesList,
          soilLevel,
          comfortable,
        );
        const income = rate * step;
        gameState.pending += income;
        earned += income;

        if (
          !canBreedInEnvironment(
            terrarium.food,
            terrarium.humidity,
            terrarium.temperature,
          )
        ) {
          continue;
        }
        let capacityLeft =
          getCapacity(terrarium.spaceLevel) - getPopulationCount(terrarium.population);
        for (const species of speciesList) {
          const current = terrarium.population.get(species.speciesId) || 0;
          if (current < 2) continue;
          const limit = getBreedInterval(
            getBaseBreedSeconds(species.rarity),
            nurseryLevel,
          );
          const progressed = Math.min(
            limit,
            (terrarium.breeding.get(species.speciesId) || 0) + step,
          );
          terrarium.breeding.set(species.speciesId, progressed);
          if (progressed >= limit && capacityLeft > 0) {
            terrarium.breeding.set(species.speciesId, 0);
            terrarium.population.set(species.speciesId, current + 1);
            capacityLeft--;
            babies.set(
              species.speciesId,
              (babies.get(species.speciesId) || 0) + 1,
            );
            this.grantXp(gameState, 8);
            gameState.stats.births++;
            gameState.daily.births++;
          }
        }
      }
    }

    const totalBirths = [...babies.values()].reduce((a, b) => a + b, 0);
    if (totalBirths > 0) {
      const text =
        [...babies.entries()]
          .map(([id, n]) => `${speciesById.get(id)?.name ?? id} ${n}마리`)
          .join(', ') + '가 태어났어요.';
      this.pushLog(gameState, 'heart', text);
    }

    await gameState.save();
    return { gameState, births: totalBirths, earned };
  }

  async addTerrarium(userId: string, name?: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);

    const owned = gameState.terrariums.length;
    if (owned >= MAX_TERRARIUMS) {
      throw new BadRequestException(
        `사육장은 최대 ${MAX_TERRARIUMS}개까지 만들 수 있어요.`,
      );
    }
    const cost = getTerrariumCost(owned);
    if (gameState.coins < cost) {
      throw new BadRequestException(
        `새 사육장에는 ${cost.toLocaleString('ko-KR')} G가 필요해요.`,
      );
    }

    const terrariumName = name?.trim() || `사육장 ${owned + 1}`;
    const terrariumId = this.newTerrariumId();
    gameState.coins -= cost;
    this.grantXp(gameState, 20);
    gameState.terrariums.push({
      terrariumId,
      name: terrariumName,
      spaceLevel: 0,
      food: 85,
      humidity: 78,
      temperature: 24,
      population: new Map(),
      breeding: new Map(),
    });
    this.pushLog(
      gameState,
      'sprout',
      `${terrariumName}을(를) 새로 만들었어요. -${cost.toLocaleString('ko-KR')} G`,
    );

    await gameState.save();
    return {
      gameState,
      terrariumId,
      message: `${terrariumName}이(가) 생겼어요!`,
    };
  }

  // 한 종의 모든 개체를 다른 사육장으로 옮긴다.
  async moveSpecies(
    userId: string,
    speciesId: string,
    fromTerrariumId: string,
    toTerrariumId: string,
  ) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    if (fromTerrariumId === toTerrariumId) {
      throw new BadRequestException('같은 사육장으로는 이사할 수 없어요.');
    }
    const from = this.getTerrarium(gameState, fromTerrariumId);
    const to = this.getTerrarium(gameState, toTerrariumId);

    const count = from.population.get(speciesId) || 0;
    if (count < 1) {
      throw new BadRequestException(`${from.name}에 없는 종이에요.`);
    }
    const room = getCapacity(to.spaceLevel) - getPopulationCount(to.population);
    if (count > room) {
      throw new BadRequestException(
        `${to.name}에 자리가 부족해요. (필요 ${count}마리 / 남은 자리 ${Math.max(0, room)}마리)`,
      );
    }

    const alreadyThere = to.population.get(speciesId) || 0;
    to.population.set(speciesId, alreadyThere + count);
    // 도착지에 같은 종이 이미 있으면 그쪽 번식 진행도를 유지하고, 없으면 진행도도 함께 옮긴다.
    if (!alreadyThere) {
      to.breeding.set(speciesId, from.breeding.get(speciesId) || 0);
    }
    from.population.delete(speciesId);
    from.breeding.delete(speciesId);

    const species = await this.speciesService.findOne(speciesId);
    const speciesName = species?.name ?? speciesId;
    this.pushLog(
      gameState,
      'leaf',
      `${speciesName} ${count}마리가 ${from.name}에서 ${to.name}(으)로 이사했어요.`,
    );

    await gameState.save();
    return {
      gameState,
      message: `${speciesName} ${count}마리가 ${to.name}(으)로 이사했어요!`,
    };
  }

  async care(userId: string, action: CareAction, terrariumId?: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    this.resetDailyIfNeeded(gameState);
    const terrarium = this.getTerrarium(gameState, terrariumId);
    const cooldownKey = `${terrarium.terrariumId}:${action}`;
    const now = Date.now();
    if ((gameState.cooldowns.get(cooldownKey) || 0) > now) {
      throw new BadRequestException('조금만 기다려 주세요.');
    }

    let message: string;
    if (action === 'feed') {
      terrarium.food = clamp(terrarium.food + 30, 0, 100);
      gameState.daily.feed++;
      this.grantXp(gameState, 4);
      message = '신선한 낙엽을 채웠어요. 맛있게 먹어!';
    } else if (action === 'mist') {
      terrarium.humidity = 78;
      message = '숲이 촉촉해졌어요. 습도 78%';
    } else {
      terrarium.temperature = 24;
      message = '포근한 24°C로 맞췄어요.';
    }
    gameState.cooldowns.set(cooldownKey, now + CARE_COOLDOWN_MS);

    await gameState.save();
    return { gameState, message };
  }

  async observe(userId: string, speciesId: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    if (!(this.totalOf(gameState, speciesId) > 0)) {
      throw new BadRequestException('아직 만나지 못한 식구예요.');
    }
    this.resetDailyIfNeeded(gameState);
    const now = Date.now();
    if ((gameState.cooldowns.get('observe') || 0) > now) {
      throw new BadRequestException('조금만 기다려 주세요.');
    }

    gameState.cooldowns.set('observe', now + OBSERVE_COOLDOWN_MS);
    gameState.coins += OBSERVE_REWARD;
    gameState.stats.earned += OBSERVE_REWARD;
    this.grantXp(gameState, 1);
    gameState.daily.observe++;

    const species = await this.speciesService.findOne(speciesId);
    await gameState.save();
    return {
      gameState,
      message: `${species?.name ?? speciesId} 관찰 완료! +${OBSERVE_REWARD} G`,
      coins: OBSERVE_REWARD,
    };
  }

  // 보유한 종 하나를 내보내 희귀도를 굴려 뽑은 야생 개체와 맞붙는다. 실제 개체 수는 줄지 않는다.
  async battle(userId: string, speciesId: string, difficulty: number) {
    if (!Number.isInteger(difficulty) || difficulty < 0 || difficulty >= RARITIES.length) {
      throw new BadRequestException('올바르지 않은 난이도예요.');
    }
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    if (!(this.totalOf(gameState, speciesId) > 0)) {
      throw new BadRequestException('아직 만나지 못한 식구예요.');
    }
    const now = Date.now();
    if ((gameState.cooldowns.get('battle') || 0) > now) {
      throw new BadRequestException('조금만 기다려 주세요.');
    }
    gameState.cooldowns.set('battle', now + BATTLE_COOLDOWN_MS);

    const speciesList = await this.speciesService.findAll();
    const mySpecies = speciesList.find((s) => s.speciesId === speciesId);
    if (!mySpecies) {
      throw new BadRequestException('존재하지 않는 종이에요.');
    }
    // 난이도 = 상대 희귀도를 그대로 고른다. 어떤 종이 나올지만 그 등급 안에서 무작위다.
    const enemySpecies = pickRandomOfRarity(speciesList, difficulty, Math.random());

    const beforeXp = gameState.battleXp.get(speciesId) || 0;
    const beforeLevel = getBattleLevel(beforeXp);
    const mine = rollCombatStats(mySpecies.rarity, beforeLevel);
    // 야생 개체 레벨은 내 종 레벨 기준 ±1. 내가 키울수록 상대도 같이 세진다.
    const enemyLevel = rollEnemyLevel(beforeLevel);
    const enemy = rollCombatStats(enemySpecies.rarity, enemyLevel);
    const { winner, log } = simulateBattle(mine, enemy);

    const won = winner === 'me';
    const speciesXpGain = won
      ? BATTLE_SPECIES_XP_BY_RARITY[difficulty]
      : Math.round(BATTLE_SPECIES_XP_BY_RARITY[difficulty] * BATTLE_SPECIES_LOSE_XP_RATIO);
    gameState.battleXp.set(speciesId, beforeXp + speciesXpGain);
    const afterLevel = getBattleLevel(beforeXp + speciesXpGain);
    const leveledUp = afterLevel > beforeLevel;

    let reward = { coins: 0, diamonds: 0 };
    let message: string;
    if (won) {
      const coins = BATTLE_REWARD_BY_RARITY[difficulty] ?? 0;
      const diamonds =
        Math.random() < (BATTLE_DIAMOND_CHANCE_BY_RARITY[difficulty] ?? 0) ? difficulty + 1 : 0;
      gameState.coins += coins;
      gameState.diamonds += diamonds;
      gameState.stats.earned += coins;
      gameState.stats.battlesWon++;
      this.grantXp(gameState, BATTLE_ACCOUNT_XP_BY_RARITY[difficulty] ?? 0);
      reward = { coins, diamonds };
      message = `승리! 야생 ${enemySpecies.name}을(를) 이겼어요. +${coins} G${diamonds ? ` · 💎 ${diamonds}개` : ''}`;
    } else {
      gameState.stats.battlesLost++;
      this.grantXp(gameState, BATTLE_LOSE_XP);
      message = `아쉽게 패배했어요. 야생 ${enemySpecies.name}이(가) 더 강했어요.`;
    }
    if (leveledUp) {
      message += ` 🆙 ${mySpecies.name}이(가) 전투 Lv.${afterLevel}로 성장했어요!`;
    }
    this.pushLog(gameState, won ? 'trophy' : 'leaf', `${mySpecies.name} 배틀 - ${message}`);

    await gameState.save();
    const afterProgress = getBattleLevelProgress(beforeXp + speciesXpGain);
    return {
      gameState,
      message,
      result: won ? ('win' as const) : ('lose' as const),
      difficulty,
      mine: {
        speciesId: mySpecies.speciesId,
        name: mySpecies.name,
        image: mySpecies.image,
        filter: mySpecies.filter,
        rarity: mySpecies.rarity,
        stats: mine,
        level: beforeLevel,
      },
      enemy: {
        speciesId: enemySpecies.speciesId,
        name: enemySpecies.name,
        image: enemySpecies.image,
        filter: enemySpecies.filter,
        rarity: enemySpecies.rarity,
        stats: enemy,
        level: enemyLevel,
      },
      log,
      reward,
      speciesLevel: {
        speciesId: mySpecies.speciesId,
        leveledUp,
        level: afterLevel,
        currentXp: afterProgress.currentXp,
        requiredXp: afterProgress.requiredXp,
        xpGained: speciesXpGain,
      },
    };
  }

  // 상대 없이 코인을 내고 보유한 종 하나의 전투 경험치를 바로 올린다. 승패가 없는 대신 비용이 확정적이다.
  // extreme(극한 훈련)을 켜면 다이아 1개를 추가로 쓰고 경험치가 12배로 뛴다.
  async train(
    userId: string,
    speciesId: string,
    intensity: number,
    extreme = false,
  ) {
    if (
      !Number.isInteger(intensity) ||
      intensity < 0 ||
      intensity >= TRAIN_XP_BY_INTENSITY.length
    ) {
      throw new BadRequestException('올바르지 않은 훈련 강도예요.');
    }
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    if (!(this.totalOf(gameState, speciesId) > 0)) {
      throw new BadRequestException('아직 만나지 못한 식구예요.');
    }
    const now = Date.now();
    if ((gameState.cooldowns.get('train') || 0) > now) {
      throw new BadRequestException('조금만 기다려 주세요.');
    }

    const species = await this.speciesService.findOne(speciesId);
    if (!species) throw new BadRequestException('존재하지 않는 종이에요.');

    const beforeXp = gameState.battleXp.get(speciesId) || 0;
    const beforeLevel = getBattleLevel(beforeXp);
    const cost = getTrainCost(species.rarity, beforeLevel, intensity);
    const diamondCost = extreme ? TRAIN_EXTREME_DIAMOND_COST : 0;
    if (gameState.coins < cost) {
      throw new BadRequestException(
        `훈련에는 ${cost.toLocaleString('ko-KR')} G가 필요해요.`,
      );
    }
    if (gameState.diamonds < diamondCost) {
      throw new BadRequestException(
        `극한 훈련에는 💎 ${diamondCost}개가 필요해요.`,
      );
    }
    gameState.cooldowns.set(
      'train',
      now + TRAIN_COOLDOWN_MS_BY_INTENSITY[intensity],
    );
    gameState.coins -= cost;
    gameState.diamonds -= diamondCost;

    const xpGain =
      TRAIN_XP_BY_INTENSITY[intensity] *
      (extreme ? TRAIN_EXTREME_XP_MULTIPLIER : 1);
    gameState.battleXp.set(speciesId, beforeXp + xpGain);
    const afterLevel = getBattleLevel(beforeXp + xpGain);
    const leveledUp = afterLevel > beforeLevel;

    let message = `${species.name}을(를) ${extreme ? '극한 ' : ''}훈련시켰어요. -${cost.toLocaleString('ko-KR')} G${diamondCost ? ` · 💎 ${diamondCost}` : ''} · 경험치 +${xpGain}`;
    if (leveledUp) {
      message += ` 🆙 전투 Lv.${afterLevel}로 성장했어요!`;
    }
    this.pushLog(gameState, 'leaf', message);

    await gameState.save();
    const afterProgress = getBattleLevelProgress(beforeXp + xpGain);
    return {
      gameState,
      message,
      cost,
      diamondCost,
      speciesLevel: {
        speciesId: species.speciesId,
        leveledUp,
        level: afterLevel,
        currentXp: afterProgress.currentXp,
        requiredXp: afterProgress.requiredXp,
        xpGained: xpGain,
      },
    };
  }

  // 투기장(PvP) 방어 식구를 지정한다. 지정해 둬야 다른 유저의 매칭 대상(상대)이 될 수 있다.
  async setPvpDefense(userId: string, speciesId: string) {
    const gameState = await this.getOrThrow(userId);
    if (!(this.totalOf(gameState, speciesId) > 0)) {
      throw new BadRequestException('아직 만나지 못한 식구예요.');
    }
    const species = await this.speciesService.findOne(speciesId);
    if (!species) throw new BadRequestException('존재하지 않는 종이에요.');

    gameState.pvpDefenseSpeciesId = speciesId;
    this.pushLog(
      gameState,
      'flag',
      `${species.name}을(를) 투기장 방어 식구로 지정했어요.`,
    );

    await gameState.save();
    return { gameState, message: `${species.name}이(가) 방어 식구가 됐어요!` };
  }

  // 내 레이팅과 비슷한 범위에서, 방어 식구를 지정해 둔 다른 유저를 무작위로 찾는다.
  private async pickPvpOpponent(myUserId: string, myRating: number) {
    for (const band of PVP_MATCH_RATING_BANDS) {
      const candidates = await this.gameStateModel
        .find(
          {
            userId: { $ne: new Types.ObjectId(myUserId) },
            pvpDefenseSpeciesId: { $ne: null },
            pvpRating: { $gte: Math.max(0, myRating - band), $lte: myRating + band },
          },
          { userId: 1, pvpRating: 1, pvpDefenseSpeciesId: 1, terrariums: 1, battleXp: 1 },
        )
        .limit(50)
        .lean<
          {
            userId: Types.ObjectId;
            pvpRating: number;
            pvpDefenseSpeciesId: string;
            terrariums: { population: Record<string, number> }[];
            battleXp: Record<string, number>;
          }[]
        >();

      const shuffled = candidates.sort(() => Math.random() - 0.5);
      for (const candidate of shuffled) {
        const total = (candidate.terrariums || []).reduce(
          (sum, t) => sum + (t.population?.[candidate.pvpDefenseSpeciesId] || 0),
          0,
        );
        if (total > 0) return candidate;
      }
    }
    return null;
  }

  // 도전할 상대를 무작위로 찾는다(결과를 확정하지 않는 읽기 전용 동작 — 다시 눌러 재매칭할 수 있다).
  async findPvpOpponent(userId: string) {
    const gameState = await this.getOrThrow(userId);
    const candidate = await this.pickPvpOpponent(userId, gameState.pvpRating);
    if (!candidate) {
      return {
        opponent: null,
        message:
          '아직 도전할 수 있는 상대가 없어요. 다른 숲지기가 방어 식구를 지정하면 나타나요.',
      };
    }

    const species = await this.speciesService.findOne(
      candidate.pvpDefenseSpeciesId,
    );
    if (!species) {
      return {
        opponent: null,
        message: '상대를 찾지 못했어요. 다시 시도해 주세요.',
      };
    }
    const user = await this.usersService.findById(candidate.userId.toString());
    const level = getBattleLevel(
      candidate.battleXp?.[candidate.pvpDefenseSpeciesId] || 0,
    );

    return {
      opponent: {
        userId: candidate.userId.toString(),
        displayName: user ? effectiveDisplayName(user) : '숲지기',
        avatarUrl: user?.avatarUrl,
        pvpRating: candidate.pvpRating,
        species: {
          speciesId: species.speciesId,
          name: species.name,
          image: species.image,
          filter: species.filter,
          rarity: species.rarity,
        },
        level,
      },
    };
  }

  // 상대가 지정해 둔 방어 식구의 "현재" 데이터를 서버에서 직접 다시 읽어 전투한다.
  // 클라이언트가 어떤 상대·스탯을 보여줬는지는 신뢰하지 않고, 공격자(나)의 문서만 저장한다.
  async pvpBattle(userId: string, speciesId: string, opponentUserId: string) {
    if (opponentUserId === userId) {
      throw new BadRequestException('자기 자신과는 대결할 수 없어요.');
    }
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    if (!(this.totalOf(gameState, speciesId) > 0)) {
      throw new BadRequestException('아직 만나지 못한 식구예요.');
    }
    const now = Date.now();
    if ((gameState.cooldowns.get('pvp') || 0) > now) {
      throw new BadRequestException('조금만 기다려 주세요.');
    }

    const opponentState = await this.gameStateModel
      .findOne({ userId: new Types.ObjectId(opponentUserId) })
      .lean<{
        pvpDefenseSpeciesId: string | null;
        battleXp: Record<string, number>;
        terrariums: { population: Record<string, number> }[];
      }>();
    const opponentSpeciesId = opponentState?.pvpDefenseSpeciesId;
    if (!opponentState || !opponentSpeciesId) {
      throw new BadRequestException('상대를 찾을 수 없어요. 다시 매칭해 주세요.');
    }
    const opponentTotal = (opponentState.terrariums || []).reduce(
      (sum, t) => sum + (t.population?.[opponentSpeciesId] || 0),
      0,
    );
    if (opponentTotal <= 0) {
      throw new BadRequestException(
        '상대가 더 이상 그 식구를 키우지 않아요. 다시 매칭해 주세요.',
      );
    }

    const speciesList = await this.speciesService.findAll();
    const mySpecies = speciesList.find((s) => s.speciesId === speciesId);
    const opponentSpecies = speciesList.find(
      (s) => s.speciesId === opponentSpeciesId,
    );
    if (!mySpecies || !opponentSpecies) {
      throw new BadRequestException('존재하지 않는 종이에요.');
    }

    const myLevel = getBattleLevel(gameState.battleXp.get(speciesId) || 0);
    const opponentLevel = getBattleLevel(
      opponentState.battleXp?.[opponentSpeciesId] || 0,
    );
    const mine = rollCombatStats(mySpecies.rarity, myLevel);
    const enemy = rollCombatStats(opponentSpecies.rarity, opponentLevel);
    const { winner, log } = simulateBattle(mine, enemy);
    const won = winner === 'me';

    gameState.cooldowns.set('pvp', now + PVP_COOLDOWN_MS);

    const beforeRating = gameState.pvpRating;
    const ratingDelta = won ? PVP_RATING_WIN_DELTA : -PVP_RATING_LOSE_DELTA;
    gameState.pvpRating = Math.max(0, beforeRating + ratingDelta);

    const beforeXp = gameState.battleXp.get(speciesId) || 0;
    const speciesXpGain = won
      ? PVP_WIN_SPECIES_XP
      : Math.round(PVP_WIN_SPECIES_XP * BATTLE_SPECIES_LOSE_XP_RATIO);
    gameState.battleXp.set(speciesId, beforeXp + speciesXpGain);
    const afterLevel = getBattleLevel(beforeXp + speciesXpGain);
    const leveledUp = afterLevel > myLevel;

    const opponentUser = await this.usersService.findById(opponentUserId);
    const opponentName = opponentUser
      ? effectiveDisplayName(opponentUser)
      : '다른 숲지기';

    let reward = { coins: 0, diamonds: 0 };
    let message: string;
    if (won) {
      const diamonds = Math.random() < PVP_WIN_DIAMOND_CHANCE ? 1 : 0;
      gameState.coins += PVP_WIN_COIN_REWARD;
      gameState.diamonds += diamonds;
      gameState.stats.earned += PVP_WIN_COIN_REWARD;
      gameState.stats.pvpWins++;
      this.grantXp(gameState, PVP_WIN_ACCOUNT_XP);
      reward = { coins: PVP_WIN_COIN_REWARD, diamonds };
      message = `승리! ${opponentName}님의 ${opponentSpecies.name}을(를) 이겼어요. +${PVP_WIN_COIN_REWARD} G${diamonds ? ' · 💎 1개' : ''} · 레이팅 +${PVP_RATING_WIN_DELTA}`;
    } else {
      gameState.stats.pvpLosses++;
      this.grantXp(gameState, PVP_LOSE_ACCOUNT_XP);
      message = `아쉽게 패배했어요. ${opponentName}님의 ${opponentSpecies.name}이(가) 더 강했어요. 레이팅 -${PVP_RATING_LOSE_DELTA}`;
    }
    if (leveledUp) {
      message += ` 🆙 ${mySpecies.name}이(가) 전투 Lv.${afterLevel}로 성장했어요!`;
    }
    this.pushLog(gameState, won ? 'trophy' : 'leaf', `투기장 - ${message}`);

    await gameState.save();
    const afterProgress = getBattleLevelProgress(beforeXp + speciesXpGain);
    return {
      gameState,
      message,
      result: won ? ('win' as const) : ('lose' as const),
      rating: gameState.pvpRating,
      ratingDelta: gameState.pvpRating - beforeRating,
      mine: {
        speciesId: mySpecies.speciesId,
        name: mySpecies.name,
        image: mySpecies.image,
        filter: mySpecies.filter,
        rarity: mySpecies.rarity,
        stats: mine,
        level: myLevel,
      },
      enemy: {
        speciesId: opponentSpecies.speciesId,
        name: opponentSpecies.name,
        image: opponentSpecies.image,
        filter: opponentSpecies.filter,
        rarity: opponentSpecies.rarity,
        stats: enemy,
        level: opponentLevel,
        ownerName: opponentName,
      },
      log,
      reward,
      speciesLevel: {
        speciesId: mySpecies.speciesId,
        leveledUp,
        level: afterLevel,
        currentXp: afterProgress.currentXp,
        requiredXp: afterProgress.requiredXp,
        xpGained: speciesXpGain,
      },
    };
  }

  async collect(userId: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    const amount = Math.floor(gameState.pending);
    if (amount < 1) {
      throw new BadRequestException(
        '식구들이 수익을 모으고 있어요. 잠시만 기다려 주세요.',
      );
    }
    gameState.pending -= amount;
    gameState.coins += amount;
    gameState.stats.earned += amount;
    this.pushLog(
      gameState,
      'coins',
      `${amount.toLocaleString('ko-KR')} G 수익을 받았어요.`,
    );

    await gameState.save();
    return {
      gameState,
      message: `숲이 모아준 수익 +${amount.toLocaleString('ko-KR')} G`,
      coins: amount,
    };
  }

  async explore(userId: string, terrariumId?: string, useTicket = false) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    this.resetDailyIfNeeded(gameState);

    const terrarium = this.getTerrarium(gameState, terrariumId);
    const capacity = getCapacity(terrarium.spaceLevel);
    const count = getPopulationCount(terrarium.population);
    if (count + EXPLORE_YIELD > capacity) {
      throw new BadRequestException(
        `${terrarium.name}에 새 식구 2마리를 위한 자리가 부족해요. 사육장을 확장하거나 분양·이사해 주세요.`,
      );
    }

    if (useTicket) {
      if (gameState.explorationTickets < 1) {
        throw new BadRequestException('숲 탐색권이 없어요.');
      }
      gameState.explorationTickets -= 1;
    } else {
      if (gameState.coins < EXPLORE_COST) {
        throw new BadRequestException(
          `탐색에는 ${EXPLORE_COST} G가 필요해요. 수익을 받거나 식구를 분양해 보세요.`,
        );
      }
      gameState.coins -= EXPLORE_COST;
    }
    gameState.daily.explore++;

    const speciesList = await this.speciesService.findAll();
    const rarity = rollRarity(Math.random(), RARITIES);
    const species = pickRandomOfRarity(speciesList, rarity, Math.random());
    const isNew = !gameState.discovered.includes(species.speciesId);
    terrarium.population.set(
      species.speciesId,
      (terrarium.population.get(species.speciesId) || 0) + EXPLORE_YIELD,
    );
    let newSpeciesDiamonds = 0;
    if (isNew) {
      gameState.discovered.push(species.speciesId);
      newSpeciesDiamonds = NEW_SPECIES_DIAMONDS_BY_RARITY[species.rarity] ?? 0;
      gameState.diamonds += newSpeciesDiamonds;
    }
    this.grantXp(gameState, isNew ? 25 : 10);
    gameState.stats.explored++;
    this.pushLog(
      gameState,
      'search',
      `${species.name} 2마리를 만나 ${terrarium.name}에 데려왔어요.${isNew ? ` 도감에 새롭게 기록했어요! 💎 ${newSpeciesDiamonds}개 획득!` : ''}${useTicket ? ' (탐색권 사용)' : ''}`,
    );

    await gameState.save();
    return {
      gameState,
      species,
      isNew,
      message: `${species.name} 2마리가 숲에 왔어요!`,
    };
  }

  async buyTicket(userId: string, quantity = 1) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);

    const cost = EXPLORE_TICKET_PRICE * quantity;
    if (gameState.coins < cost) {
      throw new BadRequestException(
        `탐색권 ${quantity}장에는 ${cost.toLocaleString('ko-KR')} G가 필요해요.`,
      );
    }

    gameState.coins -= cost;
    gameState.explorationTickets += quantity;
    this.pushLog(
      gameState,
      'search',
      `숲 탐색권 ${quantity}장을 구매했어요. -${cost.toLocaleString('ko-KR')} G`,
    );

    await gameState.save();
    return {
      gameState,
      message: `숲 탐색권 ${quantity}장을 구매했어요!`,
    };
  }

  async sell(
    userId: string,
    speciesId: string,
    quantity: number,
    terrariumId?: string,
  ) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    const terrarium = this.getTerrarium(gameState, terrariumId);

    const species = await this.speciesService.findOne(speciesId);
    if (!species) throw new BadRequestException('분양 수량을 확인해 주세요.');

    const current = terrarium.population.get(speciesId) || 0;
    if (current - quantity < 2) {
      throw new BadRequestException('번식을 위해 2마리는 남겨둬야 해요.');
    }

    const amount = species.price * quantity;
    terrarium.population.set(speciesId, current - quantity);
    gameState.coins += amount;
    gameState.stats.sold += quantity;
    gameState.stats.earned += amount;
    this.grantXp(gameState, quantity * 3);
    this.pushLog(
      gameState,
      'coins',
      `${species.name} ${quantity}마리가 새집으로 갔어요. +${amount} G`,
    );

    await gameState.save();
    return {
      gameState,
      message: `${species.name} ${quantity}마리 분양 완료! +${amount} G`,
    };
  }

  async upgrade(userId: string, upgradeId: string, terrariumId?: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);

    const upgrade = await this.upgradesService.findOne(upgradeId);
    if (!upgrade)
      throw new BadRequestException('존재하지 않는 업그레이드예요.');

    // 공간 확장은 사육장별, 나머지 업그레이드는 계정 전체에 적용된다.
    const terrarium =
      upgradeId === 'space' ? this.getTerrarium(gameState, terrariumId) : null;
    const currentLevel = terrarium
      ? terrarium.spaceLevel
      : gameState.upgrades.get(upgradeId) || 0;
    if (currentLevel >= upgrade.max) {
      throw new BadRequestException('이미 최고 단계예요.');
    }

    const cost = this.upgradesService.costFor(upgrade, currentLevel);
    if (gameState.coins < cost) {
      throw new BadRequestException(
        `업그레이드에 ${cost.toLocaleString('ko-KR')} G가 필요해요.`,
      );
    }

    gameState.coins -= cost;
    if (terrarium) {
      terrarium.spaceLevel = currentLevel + 1;
    } else {
      gameState.upgrades.set(upgradeId, currentLevel + 1);
    }
    this.grantXp(gameState, 20);
    this.pushLog(
      gameState,
      'sprout',
      `${terrarium ? `${terrarium.name} ` : ''}${upgrade.name} Lv. ${currentLevel + 1} 업그레이드!`,
    );

    await gameState.save();
    return { gameState, message: `${upgrade.name} 업그레이드 완료!` };
  }

  async claim(userId: string, questId: string) {
    const gameState = await this.getOrThrow(userId);
    this.resetDailyIfNeeded(gameState);

    const quest = await this.questsService.findOne(questId);
    if (!quest) throw new BadRequestException('존재하지 않는 목표예요.');

    const progress = this.getDailyProgress(gameState, questId);
    if (gameState.daily.claimed.includes(questId) || progress < quest.target) {
      throw new BadRequestException('목표를 먼저 완료해 주세요.');
    }

    gameState.daily.claimed.push(questId);
    gameState.coins += quest.reward;
    gameState.stats.earned += quest.reward;
    this.grantXp(gameState, 15);
    if (quest.ticketReward) {
      gameState.explorationTickets += quest.ticketReward;
    }
    const ticketText = quest.ticketReward ? ` · 🎟️ 탐색권 ${quest.ticketReward}장` : '';
    this.pushLog(
      gameState,
      'flag',
      `오늘의 목표 달성: ${quest.label}. +${quest.reward} G${ticketText}`,
    );

    await gameState.save();
    return {
      gameState,
      message: `목표 보상 +${quest.reward} G${ticketText}를 받았어요!`,
    };
  }

  async claimAchievement(userId: string, achievementId: string) {
    const gameState = await this.getOrThrow(userId);

    const achievement = await this.achievementsService.findOne(achievementId);
    if (!achievement) {
      throw new BadRequestException('존재하지 않는 업적이에요.');
    }
    if (gameState.achievementsClaimed.includes(achievementId)) {
      throw new BadRequestException('이미 받은 업적이에요.');
    }

    const speciesList = await this.speciesService.findAll();
    const { progress, target } = getAchievementProgress(
      achievement,
      {
        discovered: gameState.discovered,
        terrariumCount: gameState.terrariums.length,
        stats: gameState.stats,
      },
      speciesList,
    );
    if (progress < target) {
      throw new BadRequestException('아직 조건을 달성하지 못했어요.');
    }

    gameState.achievementsClaimed.push(achievementId);
    gameState.coins += achievement.reward;
    gameState.stats.earned += achievement.reward;
    this.grantXp(gameState, Math.min(200, Math.round(achievement.reward / 15)));
    if (achievement.ticketReward) {
      gameState.explorationTickets += achievement.ticketReward;
    }
    if (achievement.diamondReward) {
      gameState.diamonds += achievement.diamondReward;
    }
    const bonusText =
      (achievement.ticketReward ? ` · 🎟️ 탐색권 ${achievement.ticketReward}장` : '') +
      (achievement.diamondReward ? ` · 💎 ${achievement.diamondReward}개` : '');
    this.pushLog(
      gameState,
      'trophy',
      `업적 달성: ${achievement.label}. +${achievement.reward.toLocaleString('ko-KR')} G${bonusText}`,
    );

    await gameState.save();
    return {
      gameState,
      message: `업적 달성! ${achievement.label} +${achievement.reward.toLocaleString('ko-KR')} G${bonusText}`,
    };
  }

  async setNickname(userId: string, nickname: string) {
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 12) {
      throw new BadRequestException('닉네임은 2~12자로 입력해 주세요.');
    }

    const gameState = await this.getOrThrow(userId);
    if (gameState.diamonds < NICKNAME_CHANGE_COST) {
      throw new BadRequestException(
        `닉네임 변경에는 💎 ${NICKNAME_CHANGE_COST}개가 필요해요.`,
      );
    }
    if (await this.usersService.isNicknameTaken(trimmed, userId)) {
      throw new BadRequestException('이미 사용 중인 닉네임이에요.');
    }

    gameState.diamonds -= NICKNAME_CHANGE_COST;
    const userDoc = await this.usersService.setNickname(userId, trimmed);
    this.pushLog(
      gameState,
      'flag',
      `닉네임을 "${trimmed}"(으)로 바꿨어요. -💎 ${NICKNAME_CHANGE_COST}`,
    );

    await gameState.save();
    return {
      gameState,
      user: { ...userDoc.toObject(), displayName: effectiveDisplayName(userDoc) },
      message: `닉네임이 "${trimmed}"(으)로 바뀌었어요!`,
    };
  }

  private getDailyProgress(
    gameState: GameStateDocument,
    questId: string,
  ): number {
    switch (questId) {
      case 'feed':
        return gameState.daily.feed;
      case 'observe':
        return gameState.daily.observe;
      case 'births':
        return gameState.daily.births;
      case 'explore':
        return gameState.daily.explore;
      default:
        return 0;
    }
  }

  private resetDailyIfNeeded(gameState: GameStateDocument, now = Date.now()) {
    const today = dayKey(now);
    if (gameState.daily.day !== today) {
      gameState.daily = {
        day: today,
        feed: 0,
        observe: 0,
        births: 0,
        explore: 0,
        claimed: [],
      };
      // 하루 한 장, 최대 보유 개수(MAX_FREE_EXPLORE_TICKETS)까지만 무료로 채워준다.
      // 구매/보상으로 이미 그 이상 갖고 있다면 줄이지 않고 그대로 둔다.
      if (gameState.explorationTickets < MAX_FREE_EXPLORE_TICKETS) {
        gameState.explorationTickets++;
      }
    }
  }

  private guardPaused(gameState: GameStateDocument) {
    if (gameState.paused) {
      throw new BadRequestException('일시정지를 해제하면 숲을 돌볼 수 있어요.');
    }
  }

  private pushLog(
    gameState: GameStateDocument,
    type: string,
    text: string,
    at = Date.now(),
  ) {
    gameState.logs.unshift({ at, type, text });
    if (gameState.logs.length > 60) gameState.logs.splice(60);
  }

  private newTerrariumId(): string {
    return randomBytes(4).toString('hex');
  }

  private getTerrarium(
    gameState: GameStateDocument,
    terrariumId?: string,
  ): Terrarium {
    const terrarium = terrariumId
      ? gameState.terrariums.find((t) => t.terrariumId === terrariumId)
      : gameState.terrariums[0];
    if (!terrarium) {
      throw new BadRequestException('존재하지 않는 사육장이에요.');
    }
    return terrarium;
  }

  private totalOf(gameState: GameStateDocument, speciesId: string): number {
    return gameState.terrariums.reduce(
      (sum, t) => sum + (t.population.get(speciesId) || 0),
      0,
    );
  }

  private async getOrNull(userId: string): Promise<GameStateDocument | null> {
    const doc = await this.gameStateModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    return doc ? this.ensureTerrariums(doc) : null;
  }

  // 사육장이 여러 개가 되기 전에 만들어진 저장 데이터(최상위 환경/식구/번식/공간 업그레이드)를
  // 사육장 1개짜리 구조로 옮긴다. 조건부 update라 동시에 여러 요청이 와도 한 번만 적용된다.
  private async ensureTerrariums(
    doc: GameStateDocument,
  ): Promise<GameStateDocument> {
    if (doc.terrariums.length > 0) return doc;

    const legacy = (await this.gameStateModel.collection.findOne({
      _id: doc._id,
    })) as unknown as LegacyGameState | null;
    const first = {
      terrariumId: 't1',
      name: '사육장 1',
      spaceLevel: legacy?.upgrades?.space ?? 0,
      food: legacy?.food ?? 85,
      humidity: legacy?.humidity ?? 78,
      temperature: legacy?.temperature ?? 24,
      population: legacy?.population ?? {},
      breeding: legacy?.breeding ?? {},
    };
    await this.gameStateModel.collection.updateOne(
      {
        _id: doc._id,
        $or: [
          { terrariums: { $exists: false } },
          { terrariums: { $size: 0 } },
        ],
      },
      {
        $set: { terrariums: [first] },
        $unset: {
          food: '',
          humidity: '',
          temperature: '',
          population: '',
          breeding: '',
          'upgrades.space': '',
        },
      },
    );
    return (await this.gameStateModel.findById(doc._id).exec()) ?? doc;
  }

  private async getOrThrow(userId: string): Promise<GameStateDocument> {
    const gameState = await this.getOrNull(userId);
    if (!gameState) {
      throw new NotFoundException(
        '게임 상태를 찾을 수 없어요. 먼저 게임을 시작해 주세요.',
      );
    }
    return gameState;
  }
}
