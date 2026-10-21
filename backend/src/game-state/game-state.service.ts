import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import {
  BossDuel,
  GameState,
  GameStateDocument,
  SurvivalDuel,
  SurvivalRun,
  Terrarium,
  WildDuel,
} from './schemas/game-state.schema';
import { Friendship, FriendshipDocument } from '../friends/schemas/friendship.schema';
import { PuzzleRecord, PuzzleRecordDocument } from './schemas/puzzle-record.schema';
import { RunnerRecord, RunnerRecordDocument } from './schemas/runner-record.schema';
import { TerrariumLike, TerrariumLikeDocument } from '../visit/schemas/terrarium-like.schema';
import { WeatherService } from '../weather/weather.service';
import { getWeatherEffects, pickWeightedByFamily } from '../weather/weather.data';
import {
  RUNNER_ABILITIES_BY_RARITY,
  RUNNER_AIR_JUMP_PERCENT,
  RUNNER_INVULN_TICKS,
  RUNNER_MAX_TICKS,
  RUNNER_MILESTONES,
  RUNNER_RUN_EXPIRE_MS,
  RUNNER_TPS,
  isRunnerTimePlausible,
  isValidRunnerJumps,
  simulateRunner,
} from './runner-engine';
import {
  PUZZLE_MAX_MOVES,
  PUZZLE_MILESTONES,
  PUZZLE_RANK_REWARDS,
  PUZZLE_STAGES,
  PUZZLE_STAGE_STAR_SHARDS,
  PUZZLE_STAR2_MARGIN,
  addPuzzleRewards,
  comparePuzzleScore,
  computePuzzleScore,
  getPreviousPuzzleDayKey,
  getPuzzleDayKey,
  getPuzzleRankReward,
  getPuzzleResetAt,
  getPuzzleStage,
  getPuzzleStageRewardGain,
  getPuzzleStars,
  replayPuzzleMoves,
} from './puzzle-engine';
import { EQUIPMENT_BY_ID } from '../equipment/equipment.data';
import type {
  BattleEnvironmentId,
  BattleRulesView,
  BattleTurn,
  BoostKind,
  BossDuelState,
  BossPattern,
  CombatStats,
  DuelAction,
  DuelSkillContext,
  SurvivalBuffId,
  SurvivalSegmentStatus,
  SurvivalStageResult,
  SurvivalState,
} from './game-engine';
import type { Species } from '../species/schemas/species.schema';
import { SpeciesService } from '../species/species.service';
import { DEFAULT_FAMILY, resolveFamily } from '../species/species.family';
import {
  DECOR_PROP_SLOTS,
  findDecor,
  getDecorBreedFactors,
  normalizeDecorProps,
  summarizeDecor,
  type DecorKind,
} from '../decor/decor.data';
import type { SpeciesFamily } from '../species/species.family';
import { UpgradesService } from '../upgrades/upgrades.service';
import { QuestsService } from '../quests/quests.service';
import { AchievementsService } from '../achievements/achievements.service';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { RARITIES } from '../species/species.seed-data';
import { CareAction } from './dto/care.dto';
import {
  applyBattleRules,
  describeBattleRules,
  getBossEnvironment,
  rollWildEnvironment,
  BATTLE_ACCOUNT_XP_BY_RARITY,
  BATTLE_COOLDOWN_MS,
  BATTLE_MAX_TURNS,
  DUEL_ACTIONS,
  DUEL_ACTION_INFO,
  BATTLE_DIAMOND_CHANCE_BY_RARITY,
  BATTLE_LOSE_XP,
  BATTLE_REWARD_BY_RARITY,
  BATTLE_SPECIES_LOSE_XP_RATIO,
  BATTLE_SPECIES_XP_BY_RARITY,
  BOSS_ACCOUNT_XP_BASE,
  BOSS_ACCOUNT_XP_PER_FLOOR,
  BOSS_COOLDOWN_MS,
  BOSS_DEFAULT_DIFFICULTY,
  BOOST_INFO,
  BOOST_KINDS,
  BOOST_MAX_STACK_HOURS,
  BOOST_MULTIPLIER,
  BOOST_OFFERS,
  BOSS_EXTRA_ATTEMPT_COSTS,
  BOSS_DAILY_ATTEMPTS,
  BOSS_LOSE_ACCOUNT_XP,
  BOSS_PATTERNS,
  BOSS_PROGRESS_FIELD,
  BOSS_SPECIES_XP_BASE,
  BOSS_SPECIES_XP_PER_FLOOR,
  CARE_COOLDOWN_MS,
  DIAMONDS_PER_LEVEL,
  EQUIPMENT_AWAKEN_LEVEL_GAIN,
  EQUIPMENT_BASE_MAX_LEVEL,
  EQUIPMENT_BASE_SLOTS,
  EQUIPMENT_MAX_AWAKENINGS,
  EQUIPMENT_MAX_SLOTS,
  EQUIPMENT_PITY_LIMIT,
  EQUIPMENT_SHARDS_PER_COPY,
  EQUIPMENT_PULL10_COST,
  EQUIPMENT_PULL_COST,
  EQUIPMENT_SLOT_EXPAND_COSTS,
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
  PVP_EQUIPMENT_EFFECT_RATE,
  PVP_LOSE_ACCOUNT_XP,
  PVP_MATCH_RATING_BANDS,
  PVP_REMATCH_COOLDOWN_MS,
  PVP_REMATCH_KEY_PREFIX,
  PVP_RATING_LOSE_DELTA,
  PVP_RATING_WIN_DELTA,
  PVP_WIN_ACCOUNT_XP,
  PVP_WIN_COIN_REWARD,
  PVP_WIN_DIAMOND_CHANCE,
  PVP_WIN_SPECIES_XP,
  SPECIES_NICKNAME_MAX_LENGTH,
  TERRARIUM_NAME_MAX_LENGTH,
  STEP_SECONDS,
  SURVIVAL_BUFFS,
  SURVIVAL_DAILY_ATTEMPTS,
  SURVIVAL_FIRST_REACH_EQUIPMENT,
  SURVIVAL_GOLD_BASE,
  SURVIVAL_GOLD_PER_STAGE,
  SURVIVAL_MAX_STAGE,
  SURVIVAL_MILESTONE_DIAMONDS,
  SURVIVAL_MILESTONE_EVERY,
  SURVIVAL_SPECIES_XP_BASE,
  SURVIVAL_SPECIES_XP_PER_STAGE,
  TRAIN_COOLDOWN_MS_BY_INTENSITY,
  TRAIN_EXTREME_DIAMOND_COST,
  TRAIN_EXTREME_XP_MULTIPLIER,
  TRAIN_XP_BY_INTENSITY,
  applySurvivalBuff,
  applyStatBonuses,
  getDuelActionStates,
  getDuelSkillInfo,
  getDuelIntent,
  playDuelTurn,
  canBreedInEnvironment,
  clamp,
  computeEquipmentBonuses,
  getAchievementProgress,
  getAutoIncomeRate,
  getAwakenCost,
  getAwakenSuccessChance,
  getBaseBreedSeconds,
  getBattleLevel,
  getBossDifficulty,
  getBossFloor,
  getBattleLevelProgress,
  getBreedInterval,
  getCapacity,
  getCombatBaseStats,
  getExploreCost,
  getEquipmentLevelUpCopies,
  getLevel,
  getPopulationCount,
  getTerrariumCost,
  getSurvivalStats,
  getTrainCost,
  isComfortable,
  pickBossSpecies,
  playSurvivalSegment,
  playSurvivalUntilElite,
  startSurvivalEliteDuel,
  finishSurvivalEliteWin,
  getSurvivalEnemy,
  SURVIVAL_MODES,
  SURVIVAL_EXTRA_ATTEMPT_COSTS,
  SURVIVAL_REVIVE_COSTS,
  SURVIVAL_REVIVE_HP_RATE,
  EXPEDITION_PITY_LIMIT,
  EXPEDITION_DAILY_FIELD,
  EXPEDITION_TIERS,
  LONG_OFFLINE_BREED_MIN_RARITY,
  advanceBreeding,
  getLongOfflineBreedSeconds,
  getBossCooldownSkipCost,
  getBoostFactor,
  getExpeditionPrice,
  getExpeditionTier,
  getShardLevelUpCost,
  pickExpeditionSpecies,
  rollExpeditionRarity,
  getBoostPrice,
  pickEquipmentOfRarity,
  pickRandomOfRarity,
  pickRandomOfRarityAndFamily,
  scaleStatsByMultiplier,
  rollBossStats,
  rollCombatStats,
  rollEnemyLevel,
  rollEquipmentRarity,
  summarizeEquipment,
  rollRarity,
  rollSurvivalChoices,
  scaleBossStats,
  simulateBattle,
  simulateBossBattle,
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

export interface DuelFighterView {
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  rarity: number;
  stats: CombatStats;
  level: number;
  // 계열 상성이 적용되는 전투(보스 타워·야생 배틀)에서만 채운다
  family?: SpeciesFamily;
}

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
    // 친구 수 업적 조건 조회 전용. 끝자리에 둬서 기존 테스트 생성자 호출(6개 인자)이 깨지지 않게 한다.
    @InjectModel(Friendship.name)
    private friendshipModel: Model<FriendshipDocument>,
    // 오늘의 퍼즐 기록 전용. 이것도 끝자리에 둬서 기존 테스트 생성자 호출(7개 인자)이 깨지지 않게 한다.
    @InjectModel(PuzzleRecord.name)
    private puzzleRecordModel?: Model<PuzzleRecordDocument>,
    // 콩 달리기 기록 전용(역시 끝자리).
    @InjectModel(RunnerRecord.name)
    private runnerRecordModel?: Model<RunnerRecordDocument>,
    // 사육장 좋아요 업적(받은·준 좋아요 수) 조회 전용(역시 끝자리).
    @InjectModel(TerrariumLike.name)
    private terrariumLikeModel?: Model<TerrariumLikeDocument>,
    // 오늘의 숲 날씨(번식·탐색 보너스, 비 오는 날 습도). 없으면 날씨 효과 없이 동작한다(끝자리).
    private weatherService?: WeatherService,
  ) {}

  // 보스 전투를 처리하는 중인 유저. 같은 유저의 요청이 동시에 두 번 들어와 첫 클리어 보상이나 하루 횟수를
  // 중복으로 받지 못하게 막는다(서버는 pm2 fork 한 프로세스라 메모리 집합으로 충분하다).
  private readonly bossInFlight = new Set<string>();
  // 투기장도 같은 이유로 막는다(연타로 같은 상대를 두 번 이기는 것 방지).
  private readonly pvpInFlight = new Set<string>();
  // 서바이벌도 같은 이유로 막는다(진행 상태를 읽고 쓰는 중에 같은 유저의 요청이 겹치면 보상이 두 번 지급될 수 있다).
  private readonly survivalInFlight = new Set<string>();
  private readonly shopInFlight = new Set<string>();
  private readonly expeditionInFlight = new Set<string>();
  private readonly wildDuelInFlight = new Set<string>();
  // 오늘의 퍼즐 제출·보상 수령도 같은 이유로 막는다(같은 유저의 요청이 겹치면 보상이 두 번 지급될 수 있다).
  private readonly puzzleInFlight = new Set<string>();
  private readonly runnerInFlight = new Set<string>();

  // 서로 친구(status: accepted)인 관계 수를 센다. Friendship은 양방향이라 요청자/수신자 어느 쪽에
  // 내가 있어도 센다.
  private async countFriends(userId: string): Promise<number> {
    const me = new Types.ObjectId(userId);
    return this.friendshipModel.countDocuments({
      status: 'accepted',
      $or: [{ requesterId: me }, { recipientId: me }],
    });
  }

  // 사육장 좋아요 업적용: 내 사육장이 지금 받고 있는 좋아요 수와 내가 지금 누르고 있는 좋아요 수.
  // 취소하면 줄어들기 때문에, 취소했다 다시 눌러도 늘지 않는다.
  private async countLikes(userId: string): Promise<{ received: number; given: number }> {
    if (!this.terrariumLikeModel || !Types.ObjectId.isValid(userId)) return { received: 0, given: 0 };
    const me = new Types.ObjectId(userId);
    const [received, given] = await Promise.all([
      this.terrariumLikeModel.countDocuments({ ownerId: me }),
      this.terrariumLikeModel.countDocuments({ likerId: me }),
    ]);
    return { received, given };
  }

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
      lastTickAt: Date.now(), // 새 계정은 만든 순간이 시간 진행의 기준이다
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

    const totalSeconds = clamp(seconds, 0, MAX_ADVANCE_SECONDS);
    // 서버 시계로 잰, 지난 틱 이후 흐른 시간. 8시간을 넘게 자리를 비웠다면 넘는 시간은 전설·신화 번식에 한해 인정한다.
    const nowMs = Date.now();
    const updatedAt = (gameState as unknown as { updatedAt?: Date }).updatedAt;
    const baselineMs = gameState.lastTickAt ?? updatedAt?.getTime() ?? nowMs;
    let longOfflineSeconds = getLongOfflineBreedSeconds(Math.max(0, (nowMs - baselineMs) / 1000), totalSeconds);
    if (longOfflineSeconds > 0) {
      // 같은 계정으로 요청이 동시에 여러 개 들어와도 한 요청만 이 시간을 가져가게, 읽은 lastTickAt이 그대로일 때만 바꾼다.
      const claim = await this.gameStateModel.updateOne(
        { _id: gameState._id, lastTickAt: gameState.lastTickAt ?? null },
        { $set: { lastTickAt: nowMs } },
        { timestamps: false },
      );
      if (claim.matchedCount !== 1) longOfflineSeconds = 0;
    }
    gameState.lastTickAt = nowMs;
    // 꾸미기 장식이 사육장의 같은 계열 종에게 주는 번식 진행 배율(사육장 id → 계열별 배율)
    const decorFactors = new Map(
      gameState.terrariums.map((t) => [t.terrariumId, getDecorBreedFactors(t.decorBackdrop, t.decorProps)] as const),
    );
    let remaining = totalSeconds;
    // 부스트는 시간대로 저장돼 있어서, 이번에 처리하는 구간([지금 - 처리 시간, 지금])과 겹친 부분에만 배율을 적용한다.
    const windowStartMs = Date.now() - totalSeconds * 1000;
    const activeBoosts = gameState.boosts ?? [];
    let earned = 0;
    const babies = new Map<string, number>();

    while (remaining > 0) {
      const step = Math.min(remaining, STEP_SECONDS);
      const stepStartMs = windowStartMs + (totalSeconds - remaining) * 1000;
      remaining -= step;
      const incomeFactor = getBoostFactor(activeBoosts, 'income', stepStartMs, stepStartMs + step * 1000);
      const breedFactor = getBoostFactor(activeBoosts, 'breed', stepStartMs, stepStartMs + step * 1000);
      // 그 시각의 숲 날씨(관측 기록이 없으면 효과 없음). 8시간을 넘는 자리 비움 구간에는 적용하지 않는다.
      const weatherFx = getWeatherEffects(this.weatherService?.typeAt(stepStartMs));

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
        terrarium.humidity = clamp(terrarium.humidity - 0.023 * step * weatherFx.humidityDecayMult, 0, 100);
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
        const income = rate * step * incomeFactor;
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
          const speciesFamily = resolveFamily(species);
          const decorFactor = decorFactors.get(terrarium.terrariumId)?.[speciesFamily] ?? 1;
          const weatherFactor = weatherFx.favored === speciesFamily ? weatherFx.breedFactor : 1;
          const progressed = Math.min(
            limit,
            (terrarium.breeding.get(species.speciesId) || 0) + step * breedFactor * decorFactor * weatherFactor,
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

    // 평소 상한(8시간)을 넘는 자리 비움: 전설·신화만 번식이 계속 진행된다. 환경은 처리한 마지막 상태를 기준으로
    // 하고(자동 급식·분무가 있어야 오래 유지된다), 그 상태에서 번식할 수 없으면 진행하지 않는다.
    if (longOfflineSeconds > 0) {
      const spanEndMs = nowMs - totalSeconds * 1000;
      const longFactor = getBoostFactor(activeBoosts, 'breed', spanEndMs - longOfflineSeconds * 1000, spanEndMs);
      for (const terrarium of gameState.terrariums) {
        if (!canBreedInEnvironment(terrarium.food, terrarium.humidity, terrarium.temperature)) continue;
        let capacityLeft = getCapacity(terrarium.spaceLevel) - getPopulationCount(terrarium.population);
        for (const species of speciesList) {
          if (species.rarity < LONG_OFFLINE_BREED_MIN_RARITY) continue;
          const current = terrarium.population.get(species.speciesId) || 0;
          if (current < 2) continue;
          const limit = getBreedInterval(getBaseBreedSeconds(species.rarity), nurseryLevel);
          const decorFactor = decorFactors.get(terrarium.terrariumId)?.[resolveFamily(species)] ?? 1;
          const result = advanceBreeding(
            terrarium.breeding.get(species.speciesId) || 0,
            longOfflineSeconds * longFactor * decorFactor,
            limit,
            capacityLeft,
          );
          terrarium.breeding.set(species.speciesId, result.progress);
          if (result.births > 0) {
            terrarium.population.set(species.speciesId, current + result.births);
            capacityLeft -= result.births;
            babies.set(species.speciesId, (babies.get(species.speciesId) || 0) + result.births);
            this.grantXp(gameState, 8 * result.births);
            gameState.stats.births += result.births;
            gameState.daily.births += result.births;
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

  // 이름을 정하지 않고 만든 사육장의 기본 이름. 이름을 바꾼 사육장과 겹치지 않는 가장 작은 "사육장 N"을 쓴다.
  private defaultTerrariumName(gameState: GameStateDocument): string {
    const taken = new Set(gameState.terrariums.map((t) => t.name.trim().toLowerCase()));
    let n = gameState.terrariums.length + 1;
    while (taken.has(`사육장 ${n}`)) n++;
    return `사육장 ${n}`;
  }

  // 사육장 이름을 바꾼다(무료). 이름은 나에게만 보인다. 앞뒤 공백은 지우고, 비었거나 20자를 넘거나 줄바꿈 같은
  // 제어 문자가 있거나 다른 사육장과 같은 이름(대소문자 무시)이면 거절한다. 지금 이름과 같으면 아무것도 바꾸지 않는다.
  async renameTerrarium(userId: string, terrariumId: string, name: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    const terrarium = this.getTerrarium(gameState, terrariumId);

    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('사육장 이름을 입력해 주세요.');
    }
    if (trimmed.length > TERRARIUM_NAME_MAX_LENGTH) {
      throw new BadRequestException(`사육장 이름은 ${TERRARIUM_NAME_MAX_LENGTH}자 이하로 입력해 주세요.`);
    }
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
      throw new BadRequestException('사육장 이름에 사용할 수 없는 문자가 있어요.');
    }
    if (trimmed === terrarium.name) {
      return { gameState, message: '이미 같은 이름이에요.' };
    }
    const key = trimmed.toLowerCase();
    if (gameState.terrariums.some((t) => t.terrariumId !== terrariumId && t.name.trim().toLowerCase() === key)) {
      throw new BadRequestException('같은 이름의 사육장이 이미 있어요.');
    }

    const before = terrarium.name;
    terrarium.name = trimmed;
    const message = `"${before}" 사육장의 이름을 "${trimmed}"(으)로 바꿨어요.`;
    this.pushLog(gameState, 'leaf', message);
    await gameState.save();
    return { gameState, message };
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

    const terrariumName = name?.trim() || this.defaultTerrariumName(gameState);
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
      decorBackdrop: '',
      decorProps: [],
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
    this.assertWildDifficulty(difficulty);
    const gameState = await this.getOrThrow(userId);
    const ctx = await this.beginWildBattle(gameState, speciesId, difficulty);
    const { winner, log } = simulateBattle(ctx.mine, ctx.enemy);
    return this.concludeWildBattle(gameState, ctx, winner === 'me', log);
  }

  private assertWildDifficulty(difficulty: number) {
    if (!Number.isInteger(difficulty) || difficulty < 0 || difficulty >= RARITIES.length) {
      throw new BadRequestException('올바르지 않은 난이도예요.');
    }
  }

  // 야생 배틀을 시작한다(자동 전투와 직접 전투가 같이 쓴다). 검증을 통과하면 쿨타임을 쓰고 상대를 뽑아 양쪽 능력치를 굴린다.
  private async beginWildBattle(gameState: GameStateDocument, speciesId: string, difficulty: number) {
    this.guardPaused(gameState);
    if (gameState.battleDuel) {
      throw new BadRequestException('진행 중인 직접 전투가 있어요. 이어서 하거나 포기해 주세요.');
    }
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
    const level = getBattleLevel(gameState.battleXp.get(speciesId) || 0);
    const mine = rollCombatStats(
      mySpecies.rarity,
      level,
      Math.random,
      computeEquipmentBonuses(gameState.equipmentSlots, gameState.equipment),
    );
    // 야생 개체 레벨은 내 종 레벨 기준 ±1. 내가 키울수록 상대도 같이 세진다.
    const enemyLevel = rollEnemyLevel(level);
    const enemy = rollCombatStats(enemySpecies.rarity, enemyLevel);
    // 환경은 전투마다 무작위다. 계열 상성과 환경 보정은 여기서 한 번 능력치에 곱하고, 이후(자동·직접 전투 모두)는 그 값을 쓴다.
    const environmentId = rollWildEnvironment(Math.random());
    const applied = applyBattleRules(mine, enemy, resolveFamily(mySpecies), resolveFamily(enemySpecies), environmentId);
    return {
      speciesId,
      mySpecies,
      enemySpecies,
      difficulty,
      level,
      enemyLevel,
      mine: applied.mine,
      enemy: applied.enemy,
      rules: applied.rules as BattleRulesView | null,
      environmentId,
    };
  }

  // 야생 배틀 결과를 반영한다(경험치·보상·기록·응답). 자동 전투와 직접 전투가 똑같은 보상 규칙을 쓴다.
  // 직접 전투를 끝낼 때는 진행 상태를 지우고 쿨타임을 끝난 시점부터 다시 센다.
  private async concludeWildBattle(
    gameState: GameStateDocument,
    ctx: {
      speciesId: string;
      mySpecies: Species;
      enemySpecies: Species;
      difficulty: number;
      level: number;
      enemyLevel: number;
      mine: CombatStats;
      enemy: CombatStats;
      rules: BattleRulesView | null;
    },
    won: boolean,
    log: BattleTurn[],
  ) {
    const { speciesId, mySpecies, enemySpecies, difficulty, mine, enemy } = ctx;
    if (gameState.battleDuel) {
      gameState.battleDuel = null;
      gameState.cooldowns.set('battle', Date.now() + BATTLE_COOLDOWN_MS);
    }
    const myDisplayName = this.displayNameFor(gameState, speciesId, mySpecies.name);
    const beforeXp = gameState.battleXp.get(speciesId) || 0;
    const beforeLevel = getBattleLevel(beforeXp);
    const speciesXpGain = this.boostXp(
      gameState,
      won
        ? BATTLE_SPECIES_XP_BY_RARITY[difficulty]
        : Math.round(BATTLE_SPECIES_XP_BY_RARITY[difficulty] * BATTLE_SPECIES_LOSE_XP_RATIO),
    );
    gameState.battleXp.set(speciesId, beforeXp + speciesXpGain);
    const afterLevel = getBattleLevel(beforeXp + speciesXpGain);
    const leveledUp = afterLevel > beforeLevel;
    gameState.stats.highestBattleLevel = Math.max(gameState.stats.highestBattleLevel, afterLevel);

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
      message += ` 🆙 ${myDisplayName}이(가) 전투 Lv.${afterLevel}로 성장했어요!`;
    }
    this.pushLog(gameState, won ? 'trophy' : 'leaf', `${myDisplayName} 배틀 - ${message}`);

    await gameState.save();
    const afterProgress = getBattleLevelProgress(beforeXp + speciesXpGain);
    return {
      gameState,
      message,
      result: won ? ('win' as const) : ('lose' as const),
      difficulty,
      mine: {
        speciesId: mySpecies.speciesId,
        name: myDisplayName,
        image: mySpecies.image,
        filter: mySpecies.filter,
        rarity: mySpecies.rarity,
        stats: mine,
        level: ctx.level,
        family: resolveFamily(mySpecies),
      },
      enemy: {
        speciesId: enemySpecies.speciesId,
        name: enemySpecies.name,
        image: enemySpecies.image,
        filter: enemySpecies.filter,
        rarity: enemySpecies.rarity,
        stats: enemy,
        level: ctx.enemyLevel,
        family: resolveFamily(enemySpecies),
      },
      rules: ctx.rules,
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

  // ---- 야생 배틀 직접 전투 ----
  // 자동 전투와 같은 상대·능력치·보상으로 서버가 전투 상태를 들고 한 턴씩 진행한다. 야생 개체에게는 보스 패턴이 없어서
  // 강타·웅크리기 예고는 없고, 강력한 일격과 회복을 어느 타이밍에 쓸지가 선택이다.
  private async withWildDuelLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.wildDuelInFlight.has(userId)) {
      throw new BadRequestException('전투가 진행 중이에요. 잠시만 기다려 주세요.');
    }
    this.wildDuelInFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.wildDuelInFlight.delete(userId);
    }
  }

  private toWildDuelState(duel: WildDuel): BossDuelState {
    return {
      turn: duel.turn,
      myHp: duel.myHp,
      bossHp: duel.enemyHp,
      enraged: false,
      charged: duel.charged,
      strikeCooldown: duel.strikeCooldown,
      healUsed: duel.healUsed,
      skillCooldown: duel.skillCooldown ?? 0,
      burnTurns: duel.burnTurns ?? 0,
      rootTurns: duel.rootTurns ?? 0,
    };
  }

  private wildDuelContext(duel: WildDuel, speciesList: Species[]) {
    const mySpecies = speciesList.find((s) => s.speciesId === duel.speciesId);
    const enemySpecies = speciesList.find((s) => s.speciesId === duel.enemySpeciesId);
    if (!mySpecies || !enemySpecies) {
      throw new BadRequestException('진행 중인 전투 정보를 읽지 못했어요. 포기하고 다시 시작해 주세요.');
    }
    return {
      speciesId: duel.speciesId,
      mySpecies,
      enemySpecies,
      difficulty: duel.difficulty,
      level: duel.level,
      enemyLevel: duel.enemyLevel,
      mine: { hp: duel.mineHp, atk: duel.mineAtk, def: duel.mineDef } as CombatStats,
      enemy: { hp: duel.enemyHpMax, atk: duel.enemyAtk, def: duel.enemyDef } as CombatStats,
      // 환경이 없는 전투(계열 규칙이 생기기 전에 시작한 전투)는 규칙 없이 이어서 한다. 저장된 능력치에 보정이 없기 때문이다.
      rules: duel.environment
        ? describeBattleRules(resolveFamily(mySpecies), resolveFamily(enemySpecies), duel.environment as BattleEnvironmentId)
        : null,
    };
  }

  private toWildDuelView(gameState: GameStateDocument, duel: WildDuel, ctx: ReturnType<GameStateService['wildDuelContext']>) {
    const fighter = (s: Species, name: string, stats: CombatStats, level: number): DuelFighterView => ({
      speciesId: s.speciesId,
      name,
      image: s.image,
      filter: s.filter,
      rarity: s.rarity,
      stats,
      level,
      family: resolveFamily(s),
    });
    return {
      difficulty: ctx.difficulty,
      rules: ctx.rules,
      ...this.duelCoreView(
        fighter(ctx.mySpecies, this.displayNameFor(gameState, ctx.speciesId, ctx.mySpecies.name), ctx.mine, ctx.level),
        fighter(ctx.enemySpecies, ctx.enemySpecies.name, ctx.enemy, ctx.enemyLevel),
        [],
        this.toWildDuelState(duel),
        duel.log as unknown as BattleTurn[],
      ),
    };
  }

  async getBattleDuel(userId: string) {
    const gameState = await this.getOrThrow(userId);
    const duel = gameState.battleDuel;
    if (!duel) return { duel: null };
    const speciesList = await this.speciesService.findAll();
    return { duel: this.toWildDuelView(gameState, duel, this.wildDuelContext(duel, speciesList)) };
  }

  async battleDuelStart(userId: string, speciesId: string, difficulty: number) {
    this.assertWildDifficulty(difficulty);
    return this.withWildDuelLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      const ctx = await this.beginWildBattle(gameState, speciesId, difficulty);
      gameState.battleDuel = {
        speciesId,
        difficulty,
        enemySpeciesId: ctx.enemySpecies.speciesId,
        environment: ctx.environmentId,
        enemyLevel: ctx.enemyLevel,
        level: ctx.level,
        mineHp: ctx.mine.hp,
        mineAtk: ctx.mine.atk,
        mineDef: ctx.mine.def,
        enemyHpMax: ctx.enemy.hp,
        enemyAtk: ctx.enemy.atk,
        enemyDef: ctx.enemy.def,
        turn: 1,
        myHp: ctx.mine.hp,
        enemyHp: ctx.enemy.hp,
        charged: false,
        strikeCooldown: 0,
        healUsed: false,
        skillCooldown: 0,
        burnTurns: 0,
        rootTurns: 0,
        log: [],
        startedAt: Date.now(),
      };
      await gameState.save();
      const duel = gameState.battleDuel as WildDuel;
      return {
        gameState,
        message: `야생 ${ctx.enemySpecies.name}을(를) 만났어요! 행동을 골라 주세요.`,
        duel: this.toWildDuelView(gameState, duel, ctx),
        turns: [] as BattleTurn[],
        finished: false as const,
      };
    });
  }

  // 한 턴 진행한다. 이긴 쪽이 정해지면 자동 전투와 같은 보상 응답에 finished: true를 붙여 돌려준다.
  async battleDuelAct(userId: string, action: string) {
    if (!(DUEL_ACTIONS as readonly string[]).includes(action)) {
      throw new BadRequestException('알 수 없는 행동이에요.');
    }
    return this.withWildDuelLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const duel = gameState.battleDuel;
      if (!duel) throw new BadRequestException('진행 중인 직접 전투가 없어요.');
      const speciesList = await this.speciesService.findAll();
      const ctx = this.wildDuelContext(duel, speciesList);
      const state = this.toWildDuelState(duel);
      const status = getDuelActionStates(state).find((a) => a.id === action)!;
      if (!status.available) {
        const name = DUEL_ACTION_INFO.find((a) => a.id === action)?.name ?? action;
        throw new BadRequestException(`${name}은(는) 지금 쓸 수 없어요. ${status.reason ?? ''}`.trim());
      }

      const r = playDuelTurn(ctx.mine, ctx.enemy, [], state, action as DuelAction, Math.random, {
        skill: this.duelSkillOf(ctx.mySpecies),
      });
      const log = [...(duel.log as unknown as BattleTurn[]), ...r.turns];
      if (r.winner) {
        const result = await this.concludeWildBattle(gameState, ctx, r.winner === 'me', log);
        return { ...result, finished: true as const, duel: null, turns: r.turns };
      }
      duel.turn = r.state.turn;
      duel.myHp = r.state.myHp;
      duel.enemyHp = r.state.bossHp;
      duel.charged = r.state.charged;
      duel.strikeCooldown = r.state.strikeCooldown;
      duel.healUsed = r.state.healUsed;
      duel.skillCooldown = r.state.skillCooldown ?? 0;
      duel.burnTurns = r.state.burnTurns ?? 0;
      duel.rootTurns = r.state.rootTurns ?? 0;
      duel.log = log as unknown as Record<string, unknown>[];
      await gameState.save();
      return {
        gameState,
        duel: this.toWildDuelView(gameState, duel, ctx),
        turns: r.turns,
        finished: false as const,
      };
    });
  }

  // 직접 전투를 포기한다. 패배로 처리한다(야생 배틀은 도전 횟수 제한이 없다).
  async battleDuelForfeit(userId: string) {
    return this.withWildDuelLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      const duel = gameState.battleDuel;
      if (!duel) throw new BadRequestException('진행 중인 직접 전투가 없어요.');
      const speciesList = await this.speciesService.findAll();
      const ctx = this.wildDuelContext(duel, speciesList);
      const result = await this.concludeWildBattle(gameState, ctx, false, duel.log as unknown as BattleTurn[]);
      return { ...result, finished: true as const, duel: null, turns: [] as BattleTurn[] };
    });
  }

  // 상대 없이 코인을 내고 보유한 종 하나의 전투 경험치를 바로 올린다. 승패가 없는 대신 비용이 확정적이다.
  // extreme(극한 훈련)을 켜면 다이아 4개를 추가로 쓰고 경험치가 12배로 뛴다.
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
    const myDisplayName = this.displayNameFor(gameState, speciesId, species.name);

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

    const xpGain = this.boostXp(
      gameState,
      TRAIN_XP_BY_INTENSITY[intensity] * (extreme ? TRAIN_EXTREME_XP_MULTIPLIER : 1),
    );
    gameState.battleXp.set(speciesId, beforeXp + xpGain);
    const afterLevel = getBattleLevel(beforeXp + xpGain);
    const leveledUp = afterLevel > beforeLevel;
    gameState.stats.trainCount++;
    gameState.stats.highestBattleLevel = Math.max(gameState.stats.highestBattleLevel, afterLevel);

    let message = `${myDisplayName}을(를) ${extreme ? '극한 ' : ''}훈련시켰어요. -${cost.toLocaleString('ko-KR')} G${diamondCost ? ` · 💎 ${diamondCost}` : ''} · 경험치 +${xpGain}`;
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
          {
            userId: 1,
            pvpRating: 1,
            pvpDefenseSpeciesId: 1,
            terrariums: 1,
            battleXp: 1,
            equipment: 1,
            equipmentSlots: 1,
          },
        )
        .limit(50)
        .lean<
          {
            userId: Types.ObjectId;
            pvpRating: number;
            pvpDefenseSpeciesId: string;
            terrariums: { population: Record<string, number> }[];
            battleXp: Record<string, number>;
            // 장비 기능이 생기기 전에 만든 계정은 이 필드가 아예 없다(.lean()은 기본값을 안 채운다)
            equipment?: { itemId: string; level: number; awakenCount: number }[];
            equipmentSlots?: string[];
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
        // 장비 보너스까지 반영한 미리보기 스탯(실제 전투에선 ±15% 개체 편차가 더 붙는다)
        stats: applyStatBonuses(
          getCombatBaseStats(species.rarity, level),
          computeEquipmentBonuses(
            candidate.equipmentSlots,
            candidate.equipment,
            PVP_EQUIPMENT_EFFECT_RATE,
          ),
        ),
      },
    };
  }

  // 상대가 지정해 둔 방어 식구의 "현재" 데이터를 서버에서 직접 다시 읽어 전투한다.
  // 클라이언트가 어떤 상대·스탯을 보여줬는지는 신뢰하지 않고, 공격자(나)의 문서만 저장한다.
  async pvpBattle(userId: string, speciesId: string, opponentUserId: string) {
    if (opponentUserId === userId) {
      throw new BadRequestException('자기 자신과는 대결할 수 없어요.');
    }
    if (this.pvpInFlight.has(userId)) {
      throw new BadRequestException('전투가 진행 중이에요. 잠시만 기다려 주세요.');
    }
    this.pvpInFlight.add(userId);
    try {
      return await this.runPvpBattle(userId, speciesId, opponentUserId);
    } finally {
      this.pvpInFlight.delete(userId);
    }
  }

  private async runPvpBattle(userId: string, speciesId: string, opponentUserId: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    if (!(this.totalOf(gameState, speciesId) > 0)) {
      throw new BadRequestException('아직 만나지 못한 식구예요.');
    }
    const now = Date.now();
    if ((gameState.cooldowns.get('pvp') || 0) > now) {
      throw new BadRequestException('조금만 기다려 주세요.');
    }
    // 방금 이긴 상대에게는 한동안 다시 도전할 수 없다(클라이언트가 어떤 상대를 보여줬든 서버가 막는다).
    const rematchKey = PVP_REMATCH_KEY_PREFIX + opponentUserId;
    const rematchUntil = gameState.cooldowns.get(rematchKey) || 0;
    if (rematchUntil > now) {
      const remain = Math.ceil((rematchUntil - now) / 1000);
      throw new BadRequestException(
        `방금 이긴 상대예요. ${Math.floor(remain / 60)}분 ${remain % 60}초 뒤에 다시 도전할 수 있어요. 다른 상대를 찾아 보세요.`,
      );
    }

    const opponentState = await this.gameStateModel
      .findOne({ userId: new Types.ObjectId(opponentUserId) })
      .lean<{
        pvpDefenseSpeciesId: string | null;
        battleXp: Record<string, number>;
        terrariums: { population: Record<string, number> }[];
        equipment?: { itemId: string; level: number; awakenCount: number }[];
        equipmentSlots?: string[];
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
    const myDisplayName = this.displayNameFor(gameState, speciesId, mySpecies.name);

    const myLevel = getBattleLevel(gameState.battleXp.get(speciesId) || 0);
    const opponentLevel = getBattleLevel(
      opponentState.battleXp?.[opponentSpeciesId] || 0,
    );
    // 양쪽 모두 각자 장착한 장비가 적용된다. 상대 장비도 클라이언트가 아니라 여기서 DB를 직접 읽어 계산한다.
    const mine = rollCombatStats(
      mySpecies.rarity,
      myLevel,
      Math.random,
      computeEquipmentBonuses(
        gameState.equipmentSlots,
        gameState.equipment,
        PVP_EQUIPMENT_EFFECT_RATE,
      ),
    );
    const enemy = rollCombatStats(
      opponentSpecies.rarity,
      opponentLevel,
      Math.random,
      computeEquipmentBonuses(
        opponentState.equipmentSlots,
        opponentState.equipment,
        PVP_EQUIPMENT_EFFECT_RATE,
      ),
    );
    const { winner, log } = simulateBattle(mine, enemy);
    const won = winner === 'me';

    gameState.cooldowns.set('pvp', now + PVP_COOLDOWN_MS);

    const beforeRating = gameState.pvpRating;
    const ratingDelta = won ? PVP_RATING_WIN_DELTA : -PVP_RATING_LOSE_DELTA;
    gameState.pvpRating = Math.max(0, beforeRating + ratingDelta);
    gameState.stats.peakPvpRating = Math.max(gameState.stats.peakPvpRating, gameState.pvpRating);

    const beforeXp = gameState.battleXp.get(speciesId) || 0;
    const speciesXpGain = this.boostXp(
      gameState,
      won ? PVP_WIN_SPECIES_XP : Math.round(PVP_WIN_SPECIES_XP * BATTLE_SPECIES_LOSE_XP_RATIO),
    );
    gameState.battleXp.set(speciesId, beforeXp + speciesXpGain);
    const afterLevel = getBattleLevel(beforeXp + speciesXpGain);
    const leveledUp = afterLevel > myLevel;
    gameState.stats.highestBattleLevel = Math.max(gameState.stats.highestBattleLevel, afterLevel);

    const opponentUser = await this.usersService.findById(opponentUserId);
    const opponentName = opponentUser
      ? effectiveDisplayName(opponentUser)
      : '다른 숲지기';

    let reward = { coins: 0, diamonds: 0 };
    let message: string;
    if (won) {
      // 이긴 상대는 한동안 재도전 불가. 지난 기록은 이때 같이 정리해서 맵이 계속 커지지 않게 한다.
      for (const [key, until] of [...gameState.cooldowns.entries()]) {
        if (key.startsWith(PVP_REMATCH_KEY_PREFIX) && until <= now) gameState.cooldowns.delete(key);
      }
      gameState.cooldowns.set(rematchKey, now + PVP_REMATCH_COOLDOWN_MS);
      const diamonds = Math.random() < PVP_WIN_DIAMOND_CHANCE ? 1 : 0;
      gameState.coins += PVP_WIN_COIN_REWARD;
      gameState.diamonds += diamonds;
      gameState.stats.earned += PVP_WIN_COIN_REWARD;
      gameState.stats.pvpWins++;
      gameState.stats.pvpWinStreak = (gameState.stats.pvpWinStreak || 0) + 1;
      gameState.stats.bestPvpWinStreak = Math.max(
        gameState.stats.bestPvpWinStreak || 0,
        gameState.stats.pvpWinStreak,
      );
      this.grantXp(gameState, PVP_WIN_ACCOUNT_XP);
      reward = { coins: PVP_WIN_COIN_REWARD, diamonds };
      message = `승리! ${opponentName}님의 ${opponentSpecies.name}을(를) 이겼어요. +${PVP_WIN_COIN_REWARD} G${diamonds ? ' · 💎 1개' : ''} · 레이팅 +${PVP_RATING_WIN_DELTA}`;
    } else {
      gameState.stats.pvpLosses++;
      gameState.stats.pvpWinStreak = 0;
      this.grantXp(gameState, PVP_LOSE_ACCOUNT_XP);
      message = `아쉽게 패배했어요. ${opponentName}님의 ${opponentSpecies.name}이(가) 더 강했어요. 레이팅 -${PVP_RATING_LOSE_DELTA}`;
    }
    if (leveledUp) {
      message += ` 🆙 ${myDisplayName}이(가) 전투 Lv.${afterLevel}로 성장했어요!`;
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
        name: myDisplayName,
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

  // ---- 보스 타워 ----
  // 5층마다 보스가 있는 타워. 깬 층의 다음 층(최대 BOSS_FLOOR_COUNT)까지 도전할 수 있고, 이미 깬 층은 다시 도전해
  // 소량의 보상을 받을 수 있다. 하루 도전 횟수는 승패와 상관없이 BOSS_DAILY_ATTEMPTS번이다.
  async bossBattle(
    userId: string,
    speciesId: string,
    floorNumber: number,
    difficultyId: string = BOSS_DEFAULT_DIFFICULTY,
  ) {
    const floor = getBossFloor(floorNumber);
    if (!floor) {
      throw new BadRequestException('존재하지 않는 층이에요.');
    }
    const difficulty = getBossDifficulty(difficultyId);
    if (!difficulty) {
      throw new BadRequestException('존재하지 않는 난이도예요.');
    }
    if (this.bossInFlight.has(userId)) {
      throw new BadRequestException('전투가 진행 중이에요. 잠시만 기다려 주세요.');
    }
    this.bossInFlight.add(userId);
    try {
      return await this.runBossBattle(userId, speciesId, floor, difficulty);
    } finally {
      this.bossInFlight.delete(userId);
    }
  }

  private async runBossBattle(
    userId: string,
    speciesId: string,
    floor: NonNullable<ReturnType<typeof getBossFloor>>,
    difficulty: NonNullable<ReturnType<typeof getBossDifficulty>>,
  ) {
    const gameState = await this.getOrThrow(userId);
    const ctx = await this.beginBossBattle(gameState, speciesId, floor, difficulty);
    const { winner, log } = simulateBossBattle(ctx.mine, ctx.bossStats, floor.patterns);
    return this.concludeBossBattle(gameState, ctx, winner === 'me', log);
  }

  // 보스 전투를 시작한다(자동 전투와 직접 전투가 같이 쓴다). 검증을 통과하면 도전 횟수와 쿨타임을 쓰고,
  // 내 능력치와 보스 능력치를 굴려서 돌려준다. 검증에서 거절된 시도는 횟수를 쓰지 않는다.
  private async beginBossBattle(
    gameState: GameStateDocument,
    speciesId: string,
    floor: NonNullable<ReturnType<typeof getBossFloor>>,
    difficulty: NonNullable<ReturnType<typeof getBossDifficulty>>,
  ) {
    this.guardPaused(gameState);
    this.resetDailyIfNeeded(gameState);
    if (gameState.bossDuel) {
      throw new BadRequestException('진행 중인 직접 전투가 있어요. 이어서 하거나 포기해 주세요.');
    }
    if (!(this.totalOf(gameState, speciesId) > 0)) {
      throw new BadRequestException('아직 만나지 못한 식구예요.');
    }
    const now = Date.now();
    const bossReadyAt = gameState.cooldowns.get('boss') || 0;
    if (bossReadyAt > now) {
      const remain = Math.ceil((bossReadyAt - now) / 1000);
      throw new BadRequestException(
        `보스 전투 쿨타임이에요. ${Math.floor(remain / 60)}분 ${remain % 60}초 뒤에 다시 도전할 수 있어요.`,
      );
    }
    // 깬 층은 난이도마다 따로 센다(쉬움에서 깬 층이 어려움에서 열리지는 않는다).
    const progressField = BOSS_PROGRESS_FIELD[difficulty.id];
    const highestBefore = gameState.stats[progressField] || 0;
    if (floor.floor > highestBefore + 1) {
      throw new BadRequestException(
        `${difficulty.name} 난이도는 아직 열리지 않은 층이에요. ${highestBefore + 1}층부터 도전해 주세요.`,
      );
    }
    const attemptsUsed = gameState.daily.bossAttempts || 0;
    const attemptLimit = this.bossAttemptLimit(gameState);
    if (attemptsUsed >= attemptLimit) {
      throw new BadRequestException(
        `오늘의 보스 도전 ${attemptLimit}회를 모두 썼어요. 내일 다시 도전하거나 다이아로 추가 도전을 살 수 있어요.`,
      );
    }

    const speciesList = await this.speciesService.findAll();
    const mySpecies = speciesList.find((s) => s.speciesId === speciesId);
    const bossSpecies = pickBossSpecies(floor, speciesList);
    if (!mySpecies || !bossSpecies) {
      throw new BadRequestException('존재하지 않는 종이에요.');
    }

    // 여기서부터는 도전으로 센다.
    gameState.cooldowns.set('boss', now + BOSS_COOLDOWN_MS);
    gameState.daily.bossAttempts = attemptsUsed + 1;

    const level = getBattleLevel(gameState.battleXp.get(speciesId) || 0);
    const mine = rollCombatStats(
      mySpecies.rarity,
      level,
      Math.random,
      computeEquipmentBonuses(gameState.equipmentSlots, gameState.equipment),
    );
    // 난이도 배율은 보스의 기준 능력치에 먼저 곱하고, 개체 편차(±15%)는 그 위에 붙는다.
    const rolledBoss = rollBossStats(scaleBossStats(floor.stats, difficulty.multiplier));
    // 층의 환경과 계열 상성은 굴린 능력치 위에 곱한다(공격력·방어력만). 이후(자동·직접 전투 모두)는 보정된 값을 쓴다.
    const environmentId = getBossEnvironment(floor.floor);
    const applied = applyBattleRules(mine, rolledBoss, resolveFamily(mySpecies), resolveFamily(bossSpecies), environmentId);
    return {
      speciesId,
      mySpecies,
      bossSpecies,
      floor,
      difficulty,
      level,
      mine: applied.mine,
      bossStats: applied.enemy,
      rules: applied.rules as BattleRulesView | null,
      environmentId,
    };
  }

  // 보스 전투 결과를 반영한다(경험치·보상·기록·응답). 자동 전투와 직접 전투가 똑같은 보상 규칙을 쓴다.
  // 직접 전투를 끝낼 때는 진행 상태를 지우고 쿨타임을 끝난 시점부터 다시 센다.
  private async concludeBossBattle(
    gameState: GameStateDocument,
    ctx: {
      speciesId: string;
      mySpecies: Species;
      bossSpecies: Species;
      floor: NonNullable<ReturnType<typeof getBossFloor>>;
      difficulty: NonNullable<ReturnType<typeof getBossDifficulty>>;
      level: number;
      mine: CombatStats;
      bossStats: CombatStats;
      rules: BattleRulesView | null;
    },
    won: boolean,
    log: BattleTurn[],
  ) {
    const { speciesId, mySpecies, bossSpecies, floor, difficulty, mine, bossStats } = ctx;
    const wasDuel = !!gameState.bossDuel;
    if (wasDuel) {
      gameState.bossDuel = null;
      gameState.cooldowns.set('boss', Date.now() + BOSS_COOLDOWN_MS);
    }
    this.resetDailyIfNeeded(gameState);
    const attemptLimit = this.bossAttemptLimit(gameState);
    const progressField = BOSS_PROGRESS_FIELD[difficulty.id];
    const highestBefore = gameState.stats[progressField] || 0;
    const myDisplayName = this.displayNameFor(gameState, speciesId, mySpecies.name);
    const beforeXp = gameState.battleXp.get(speciesId) || 0;
    const beforeLevel = getBattleLevel(beforeXp);
    const firstClear = won && floor.floor > highestBefore;

    // 골드와 경험치 보상은 난이도 배율만큼 늘어난다. 다이아·장비는 난이도별 첫 클리어마다 따로 받는다(배율 없음).
    const mult = difficulty.multiplier;
    const xpWin = Math.round(
      (BOSS_SPECIES_XP_BASE + BOSS_SPECIES_XP_PER_FLOOR * floor.floor) * (floor.isBoss ? 2 : 1) * mult,
    );
    const speciesXpGain = this.boostXp(gameState, won ? xpWin : Math.round(xpWin * BATTLE_SPECIES_LOSE_XP_RATIO));
    gameState.battleXp.set(speciesId, beforeXp + speciesXpGain);
    const afterLevel = getBattleLevel(beforeXp + speciesXpGain);
    const leveledUp = afterLevel > beforeLevel;
    gameState.stats.highestBattleLevel = Math.max(gameState.stats.highestBattleLevel, afterLevel);

    const floorLabel = `${difficulty.id === BOSS_DEFAULT_DIFFICULTY ? '' : `[${difficulty.name}] `}${floor.floor}층${floor.isBoss ? ' 보스' : ''} ${bossSpecies.name}`;
    let reward: {
      coins: number;
      diamonds: number;
      equipment: { itemId: string; name: string; rarity: number; isNew: boolean; copies: number } | null;
    } = { coins: 0, diamonds: 0, equipment: null };
    let message: string;
    if (won) {
      gameState.stats.bossWins = (gameState.stats.bossWins || 0) + 1;
      if (firstClear) gameState.stats[progressField] = floor.floor;

      const coins = Math.round((firstClear ? floor.rewards.firstCoins : floor.rewards.repeatCoins) * mult);
      // 다이아: 첫 클리어는 확정, 이미 깬 층을 다시 이기면 낮은 확률로만(일반 층은 둘 다 0).
      const diamonds = firstClear
        ? floor.rewards.firstDiamonds
        : Math.random() < floor.rewards.repeatDiamondChance
          ? floor.rewards.repeatDiamonds
          : 0;
      gameState.coins += coins;
      gameState.diamonds += diamonds;
      gameState.stats.earned += coins;

      // 장비: 첫 클리어는 확정, 반복 클리어는 확률. 일반 층은 장비가 없다.
      let equipmentRarity: number | null = null;
      if (floor.rewards.firstEquipmentRarity !== null) {
        if (firstClear || Math.random() < floor.rewards.repeatCopyChance) {
          equipmentRarity = floor.rewards.firstEquipmentRarity;
        }
      }
      if (equipmentRarity !== null) {
        const picked = pickEquipmentOfRarity(equipmentRarity, Math.random());
        const { item, isNew } = this.grantEquipment(gameState, picked.equipmentId);
        reward.equipment = {
          itemId: picked.equipmentId,
          name: picked.name,
          rarity: picked.rarity,
          isNew,
          copies: item.copies,
        };
      }
      reward = { ...reward, coins, diamonds };
      this.grantXp(gameState, Math.round((BOSS_ACCOUNT_XP_BASE + BOSS_ACCOUNT_XP_PER_FLOOR * floor.floor) * mult));

      const extras =
        (diamonds ? ` · 💎 ${diamonds}개` : '') +
        (reward.equipment
          ? ` · 🎒 ${reward.equipment.name}${reward.equipment.isNew ? '(새 장비!)' : ' 복사본 +1'}`
          : '');
      message = firstClear
        ? `🎉 ${floorLabel} 첫 클리어! +${coins.toLocaleString('ko-KR')} G${extras}`
        : `승리! ${floorLabel}을(를) 다시 이겼어요. +${coins.toLocaleString('ko-KR')} G${extras}`;
    } else {
      this.grantXp(gameState, BOSS_LOSE_ACCOUNT_XP);
      message = `${floorLabel}에게 패배했어요. 장비나 전투 레벨을 키워 다시 도전해 보세요.`;
    }
    const attemptsLeft = attemptLimit - gameState.daily.bossAttempts;
    message += ` (오늘 남은 도전 ${attemptsLeft}회)`;
    if (leveledUp) {
      message += ` 🆙 ${myDisplayName}이(가) 전투 Lv.${afterLevel}로 성장했어요!`;
    }
    this.pushLog(gameState, won ? 'trophy' : 'leaf', `보스 타워 - ${message}`);

    await gameState.save();
    const afterProgress = getBattleLevelProgress(beforeXp + speciesXpGain);
    return {
      gameState,
      message,
      result: won ? ('win' as const) : ('lose' as const),
      floor: floor.floor,
      isBoss: floor.isBoss,
      difficulty: { id: difficulty.id, name: difficulty.name, multiplier: difficulty.multiplier },
      firstClear,
      attemptsLeft,
      patterns: floor.patterns.map((p) => BOSS_PATTERNS[p]),
      mine: {
        speciesId: mySpecies.speciesId,
        name: myDisplayName,
        image: mySpecies.image,
        filter: mySpecies.filter,
        rarity: mySpecies.rarity,
        stats: mine,
        level: ctx.level,
        family: resolveFamily(mySpecies),
      },
      enemy: {
        speciesId: bossSpecies.speciesId,
        name: bossSpecies.name,
        image: bossSpecies.image,
        filter: bossSpecies.filter,
        rarity: bossSpecies.rarity,
        stats: bossStats,
        level: floor.floor,
        family: resolveFamily(bossSpecies),
      },
      rules: ctx.rules,
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

  // ---- 보스 직접 전투 ----
  // 자동 전투와 같은 규칙·능력치·보상으로, 서버가 전투 상태를 들고 한 턴씩 진행한다. 시작할 때 도전 횟수와 쿨타임을 쓰고,
  // 끝나면(승·패·포기) 자동 전투와 똑같이 보상을 반영한다(concludeBossBattle).
  private toDuelState(duel: BossDuel): BossDuelState {
    return {
      turn: duel.turn,
      myHp: duel.myHp,
      bossHp: duel.bossHp,
      enraged: duel.enraged,
      charged: duel.charged,
      strikeCooldown: duel.strikeCooldown,
      healUsed: duel.healUsed,
      skillCooldown: duel.skillCooldown ?? 0,
      burnTurns: duel.burnTurns ?? 0,
      rootTurns: duel.rootTurns ?? 0,
    };
  }

  // 저장된 직접 전투에서 양쪽 종·층·능력치를 되살린다. 저장된 값이 더는 유효하지 않으면(층·종이 사라진 경우) 포기하게 안내한다.
  private bossDuelContext(duel: BossDuel, speciesList: Species[]) {
    const floor = getBossFloor(duel.floor);
    const difficulty = getBossDifficulty(duel.difficulty);
    const mySpecies = speciesList.find((s) => s.speciesId === duel.speciesId);
    const bossSpecies = floor ? pickBossSpecies(floor, speciesList) : null;
    if (!floor || !difficulty || !mySpecies || !bossSpecies) {
      throw new BadRequestException('진행 중인 전투 정보를 읽지 못했어요. 포기하고 다시 시작해 주세요.');
    }
    return {
      speciesId: duel.speciesId,
      mySpecies,
      bossSpecies,
      floor,
      difficulty,
      level: duel.level,
      mine: { hp: duel.mineHp, atk: duel.mineAtk, def: duel.mineDef } as CombatStats,
      bossStats: { hp: duel.bossHpMax, atk: duel.bossAtk, def: duel.bossDef } as CombatStats,
      // 환경이 없는 전투(계열 규칙이 생기기 전에 시작한 전투)는 규칙 없이 이어서 한다. 저장된 능력치에 보정이 없기 때문이다.
      rules: duel.environment
        ? describeBattleRules(resolveFamily(mySpecies), resolveFamily(bossSpecies), duel.environment as BattleEnvironmentId)
        : null,
    };
  }

  // 내 식구의 계열 기술(직접 전투 행동). 계열은 종의 계열, 위력은 희귀도로 정해진다.
  private duelSkillOf(species: { speciesId: string; family?: string; rarity: number }): DuelSkillContext {
    return { family: resolveFamily(species), rarity: species.rarity };
  }

  // 직접 전투 화면에 공통으로 필요한 부분(양쪽 정보, 상태, 예고, 행동 목록, 기록). 보스·야생·서바이벌이 같이 쓴다.
  // state.bossHp는 보스뿐 아니라 상대(야생 개체·엘리트)의 현재 HP를 뜻한다.
  private duelCoreView(
    mine: DuelFighterView,
    enemy: DuelFighterView,
    patterns: readonly BossPattern[],
    state: BossDuelState,
    log: BattleTurn[],
  ) {
    const states = getDuelActionStates(state);
    return {
      patterns: patterns.map((p) => BOSS_PATTERNS[p]),
      mine,
      enemy,
      maxTurns: BATTLE_MAX_TURNS,
      state: {
        turn: state.turn,
        myHp: state.myHp,
        bossHp: state.bossHp,
        enraged: state.enraged,
        charged: state.charged,
        strikeCooldown: state.strikeCooldown,
        healUsed: state.healUsed,
        skillCooldown: state.skillCooldown ?? 0,
        burnTurns: state.burnTurns ?? 0,
        rootTurns: state.rootTurns ?? 0,
      },
      intent: getDuelIntent(patterns, state.turn),
      // 계열 기술의 이름·설명은 내 식구의 계열·희귀도에 따라 달라서 여기서 채운다
      actions: DUEL_ACTION_INFO.map((info) => ({
        ...(info.id === 'skill' ? getDuelSkillInfo({ family: mine.family ?? DEFAULT_FAMILY, rarity: mine.rarity }) : info),
        ...states.find((a) => a.id === info.id)!,
      })),
      log,
    };
  }

  private toBossDuelView(gameState: GameStateDocument, duel: BossDuel, ctx: ReturnType<GameStateService['bossDuelContext']>) {
    const fighter = (s: Species, name: string, stats: CombatStats, level: number): DuelFighterView => ({
      speciesId: s.speciesId,
      name,
      image: s.image,
      filter: s.filter,
      rarity: s.rarity,
      stats,
      level,
      family: resolveFamily(s),
    });
    return {
      floor: ctx.floor.floor,
      isBoss: ctx.floor.isBoss,
      rules: ctx.rules,
      difficulty: { id: ctx.difficulty.id, name: ctx.difficulty.name, multiplier: ctx.difficulty.multiplier },
      ...this.duelCoreView(
        fighter(ctx.mySpecies, this.displayNameFor(gameState, ctx.speciesId, ctx.mySpecies.name), ctx.mine, ctx.level),
        fighter(ctx.bossSpecies, ctx.bossSpecies.name, ctx.bossStats, ctx.floor.floor),
        ctx.floor.patterns,
        this.toDuelState(duel),
        duel.log as unknown as BattleTurn[],
      ),
    };
  }

  async getBossDuel(userId: string) {
    const gameState = await this.getOrThrow(userId);
    const duel = gameState.bossDuel;
    if (!duel) return { duel: null };
    const speciesList = await this.speciesService.findAll();
    return { duel: this.toBossDuelView(gameState, duel, this.bossDuelContext(duel, speciesList)) };
  }

  async bossDuelStart(
    userId: string,
    speciesId: string,
    floorNumber: number,
    difficultyId: string = BOSS_DEFAULT_DIFFICULTY,
  ) {
    const floor = getBossFloor(floorNumber);
    if (!floor) throw new BadRequestException('존재하지 않는 층이에요.');
    const difficulty = getBossDifficulty(difficultyId);
    if (!difficulty) throw new BadRequestException('존재하지 않는 난이도예요.');
    return this.withBossLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      const ctx = await this.beginBossBattle(gameState, speciesId, floor, difficulty);
      gameState.bossDuel = {
        speciesId,
        floor: floor.floor,
        difficulty: difficulty.id,
        environment: ctx.environmentId,
        level: ctx.level,
        mineHp: ctx.mine.hp,
        mineAtk: ctx.mine.atk,
        mineDef: ctx.mine.def,
        bossHpMax: ctx.bossStats.hp,
        bossAtk: ctx.bossStats.atk,
        bossDef: ctx.bossStats.def,
        turn: 1,
        myHp: ctx.mine.hp,
        bossHp: ctx.bossStats.hp,
        enraged: false,
        charged: false,
        strikeCooldown: 0,
        healUsed: false,
        skillCooldown: 0,
        burnTurns: 0,
        rootTurns: 0,
        log: [],
        startedAt: Date.now(),
      };
      await gameState.save();
      const speciesList = await this.speciesService.findAll();
      const duel = gameState.bossDuel as BossDuel;
      return {
        gameState,
        message: `직접 전투를 시작했어요! 행동을 골라 주세요.`,
        duel: this.toBossDuelView(gameState, duel, this.bossDuelContext(duel, speciesList)),
        turns: [] as BattleTurn[],
        finished: false as const,
      };
    });
  }

  // 한 턴 진행한다. 이긴 쪽이 정해지면 자동 전투와 같은 보상 응답에 finished: true를 붙여 돌려준다.
  async bossDuelAct(userId: string, action: string) {
    if (!(DUEL_ACTIONS as readonly string[]).includes(action)) {
      throw new BadRequestException('알 수 없는 행동이에요.');
    }
    return this.withBossLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const duel = gameState.bossDuel;
      if (!duel) throw new BadRequestException('진행 중인 직접 전투가 없어요.');
      const speciesList = await this.speciesService.findAll();
      const ctx = this.bossDuelContext(duel, speciesList);
      const state = this.toDuelState(duel);
      const status = getDuelActionStates(state).find((a) => a.id === action)!;
      if (!status.available) {
        const name = DUEL_ACTION_INFO.find((a) => a.id === action)?.name ?? action;
        throw new BadRequestException(`${name}은(는) 지금 쓸 수 없어요. ${status.reason ?? ''}`.trim());
      }

      const r = playDuelTurn(ctx.mine, ctx.bossStats, ctx.floor.patterns, state, action as DuelAction, Math.random, {
        skill: this.duelSkillOf(ctx.mySpecies),
      });
      const log = [...(duel.log as unknown as BattleTurn[]), ...r.turns];
      if (r.winner) {
        const result = await this.concludeBossBattle(gameState, ctx, r.winner === 'me', log);
        return { ...result, finished: true as const, duel: null, turns: r.turns };
      }
      duel.turn = r.state.turn;
      duel.myHp = r.state.myHp;
      duel.bossHp = r.state.bossHp;
      duel.enraged = r.state.enraged;
      duel.charged = r.state.charged;
      duel.strikeCooldown = r.state.strikeCooldown;
      duel.healUsed = r.state.healUsed;
      duel.skillCooldown = r.state.skillCooldown ?? 0;
      duel.burnTurns = r.state.burnTurns ?? 0;
      duel.rootTurns = r.state.rootTurns ?? 0;
      duel.log = log as unknown as Record<string, unknown>[];
      await gameState.save();
      return {
        gameState,
        duel: this.toBossDuelView(gameState, duel, ctx),
        turns: r.turns,
        finished: false as const,
      };
    });
  }

  // 직접 전투를 포기한다. 이미 쓴 도전 횟수는 돌려주지 않고, 패배로 처리한다.
  async bossDuelForfeit(userId: string) {
    return this.withBossLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      const duel = gameState.bossDuel;
      if (!duel) throw new BadRequestException('진행 중인 직접 전투가 없어요.');
      const speciesList = await this.speciesService.findAll();
      const ctx = this.bossDuelContext(duel, speciesList);
      const result = await this.concludeBossBattle(gameState, ctx, false, duel.log as unknown as BattleTurn[]);
      return { ...result, finished: true as const, duel: null, turns: [] as BattleTurn[] };
    });
  }

  // ---- 부스트 상점 ----
  // 켜져 있는 부스트의 끝나는 시각(ms). 꺼져 있으면 0.
  private activeBoostUntil(gameState: GameStateDocument, kind: BoostKind, now = Date.now()): number {
    const found = (gameState.boosts ?? []).find((b) => b.kind === kind);
    return found && found.until > now ? found.until : 0;
  }

  // 전투 경험치 부스트가 켜져 있으면 경험치를 배율만큼 늘린다.
  private boostXp(gameState: GameStateDocument, xp: number): number {
    return this.activeBoostUntil(gameState, 'battleXp') > 0 ? Math.round(xp * BOOST_MULTIPLIER) : xp;
  }

  // 지금 사육 중인 식구로 쾌적한 환경에서 1시간 동안 버는 최대 수익. 부스트 가격의 기준이 된다.
  private hourlyIncomePotential(gameState: GameStateDocument, speciesList: Species[]): number {
    const soilLevel = gameState.upgrades.get('soil') || 0;
    let perSecond = 0;
    for (const terrarium of gameState.terrariums) {
      perSecond += getAutoIncomeRate(terrarium.population, speciesList, soilLevel, true);
    }
    return perSecond * 3600;
  }

  async getBoostShop(userId: string) {
    const gameState = await this.getOrThrow(userId);
    const speciesList = await this.speciesService.findAll();
    const hourlyIncome = this.hourlyIncomePotential(gameState, speciesList);
    const now = Date.now();
    return {
      hourlyIncome: Math.round(hourlyIncome),
      multiplier: BOOST_MULTIPLIER,
      maxStackHours: BOOST_MAX_STACK_HOURS,
      boosts: BOOST_INFO.map((info) => ({
        ...info,
        activeUntil: this.activeBoostUntil(gameState, info.kind, now),
        offers: BOOST_OFFERS.map((o) => ({ hours: o.hours, price: getBoostPrice(info.kind, o.hours, hourlyIncome) })),
      })),
    };
  }

  // 부스트를 산다. 이미 켜져 있으면 끝나는 시각이 늘어나고(최대 BOOST_MAX_STACK_HOURS), 꺼져 있으면 지금부터 시작한다.
  async buyBoost(userId: string, kind: string, hours: number) {
    if (!BOOST_KINDS.includes(kind as BoostKind)) {
      throw new BadRequestException('존재하지 않는 부스트예요.');
    }
    if (!BOOST_OFFERS.some((o) => o.hours === hours)) {
      throw new BadRequestException('살 수 없는 시간이에요.');
    }
    if (this.shopInFlight.has(userId)) {
      throw new BadRequestException('구매를 처리하는 중이에요. 잠시만 기다려 주세요.');
    }
    this.shopInFlight.add(userId);
    try {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const speciesList = await this.speciesService.findAll();
      const price = getBoostPrice(kind as BoostKind, hours, this.hourlyIncomePotential(gameState, speciesList));
      if (gameState.coins < price) {
        throw new BadRequestException(`골드가 부족해요. ${price.toLocaleString('ko-KR')} G가 필요해요.`);
      }
      const now = Date.now();
      const current = (gameState.boosts ?? []).find((b) => b.kind === kind && b.until > now);
      const remainingMs = current ? current.until - now : 0;
      if (remainingMs + hours * 3_600_000 > BOOST_MAX_STACK_HOURS * 3_600_000) {
        throw new BadRequestException(`부스트는 최대 ${BOOST_MAX_STACK_HOURS}시간까지 쌓을 수 있어요.`);
      }
      const bought = current
        ? { kind, from: current.from, until: current.until + hours * 3_600_000 }
        : { kind, from: now, until: now + hours * 3_600_000 };
      // 다른 종류는 그대로 두고(만료된 것은 정리), 이 종류만 새 시간대로 바꾼다.
      const others = (gameState.boosts ?? [])
        .filter((b) => b.kind !== kind && b.until > now)
        .map((b) => ({ kind: b.kind, from: b.from, until: b.until }));
      gameState.boosts = [...others, bought];
      gameState.coins -= price;
      const name = BOOST_INFO.find((b) => b.kind === kind)?.name ?? kind;
      const message = `${name} ${hours}시간을 샀어요. (-${price.toLocaleString('ko-KR')} G)`;
      this.pushLog(gameState, 'coins', message);
      await gameState.save();
      return { gameState, message, price, activeUntil: bought.until };
    } finally {
      this.shopInFlight.delete(userId);
    }
  }

  // 장식을 산다(골드, 계정에 영구히 남는다). 이미 가진 장식은 다시 살 수 없다.
  async buyDecor(userId: string, decorId: string) {
    const item = findDecor(decorId);
    if (!item) {
      throw new BadRequestException('존재하지 않는 장식이에요.');
    }
    if (this.shopInFlight.has(userId)) {
      throw new BadRequestException('구매를 처리하는 중이에요. 잠시만 기다려 주세요.');
    }
    this.shopInFlight.add(userId);
    try {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const owned = gameState.decorOwned ?? [];
      if (owned.includes(decorId)) {
        throw new BadRequestException('이미 가지고 있는 장식이에요.');
      }
      if (gameState.coins < item.price) {
        throw new BadRequestException(`골드가 부족해요. ${item.price.toLocaleString('ko-KR')} G가 필요해요.`);
      }
      gameState.coins -= item.price;
      gameState.decorOwned = [...owned, decorId];
      const message = `${item.icon} ${item.name}을(를) 샀어요. (-${item.price.toLocaleString('ko-KR')} G)`;
      this.pushLog(gameState, 'coins', message);
      await gameState.save();
      return { gameState, message, price: item.price };
    } finally {
      this.shopInFlight.delete(userId);
    }
  }

  // 사육장 한 칸에 장식을 놓거나(decorId) 비운다(decorId 없음). 무료이고, 산 장식만 놓을 수 있다.
  // 배경은 사육장마다 하나, 소품은 DECOR_PROP_SLOTS칸이며 같은 소품을 한 사육장에 두 개 놓을 수 없다.
  async placeDecor(userId: string, terrariumId: string, kind: DecorKind, index: number | undefined, decorId: string | undefined) {
    if (kind !== 'backdrop' && kind !== 'prop') {
      throw new BadRequestException('알 수 없는 장식 칸이에요.');
    }
    if (kind === 'prop' && !(Number.isInteger(index) && (index as number) >= 0 && (index as number) < DECOR_PROP_SLOTS)) {
      throw new BadRequestException(`소품은 1~${DECOR_PROP_SLOTS}번 칸에 놓을 수 있어요.`);
    }
    const item = decorId ? findDecor(decorId) : undefined;
    if (decorId && !item) {
      throw new BadRequestException('존재하지 않는 장식이에요.');
    }
    if (item && item.kind !== kind) {
      throw new BadRequestException(kind === 'backdrop' ? '배경 칸에는 배경 장식만 놓을 수 있어요.' : '소품 칸에는 소품만 놓을 수 있어요.');
    }
    if (this.shopInFlight.has(userId)) {
      throw new BadRequestException('처리 중이에요. 잠시만 기다려 주세요.');
    }
    this.shopInFlight.add(userId);
    try {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const terrarium = this.getTerrarium(gameState, terrariumId);
      if (item && !(gameState.decorOwned ?? []).includes(item.decorId)) {
        throw new BadRequestException('아직 가지고 있지 않은 장식이에요.');
      }
      if (kind === 'backdrop') {
        terrarium.decorBackdrop = item?.decorId ?? '';
      } else {
        const props = normalizeDecorProps(terrarium.decorProps);
        if (item && props.some((id, i) => id === item.decorId && i !== index)) {
          throw new BadRequestException('이 사육장에는 이미 놓여 있는 소품이에요.');
        }
        props[index as number] = item?.decorId ?? '';
        terrarium.decorProps = props;
      }
      const message = item ? `${item.icon} ${item.name}을(를) "${terrarium.name}"에 놓았어요.` : `"${terrarium.name}"의 장식을 치웠어요.`;
      await gameState.save();
      return { gameState, message };
    } finally {
      this.shopInFlight.delete(userId);
    }
  }

  // 다른 유저가 내 사육장을 방문해 볼 수 있는지 정한다(무료). 꺼도 내 화면과 이미 받은 좋아요에는 영향이 없다.
  async setTerrariumPublic(userId: string, isPublic: boolean) {
    const gameState = await this.getOrThrow(userId);
    gameState.terrariumPublic = isPublic;
    const message = isPublic ? '이제 다른 유저가 내 사육장을 구경할 수 있어요.' : '이제 내 사육장은 나만 볼 수 있어요.';
    await gameState.save();
    return { gameState, message };
  }

  private bossAttemptLimit(gameState: GameStateDocument) {
    return BOSS_DAILY_ATTEMPTS + (gameState.daily.bossExtraAttempts || 0);
  }

  private bossExtraInfo(gameState: GameStateDocument) {
    const bought = gameState.daily.bossExtraAttempts || 0;
    const max = BOSS_EXTRA_ATTEMPT_COSTS.length;
    return { bought, max, nextCost: bought < max ? BOSS_EXTRA_ATTEMPT_COSTS[bought] : null };
  }

  private async withBossLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.bossInFlight.has(userId)) {
      throw new BadRequestException('전투가 진행 중이에요. 잠시만 기다려 주세요.');
    }
    this.bossInFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.bossInFlight.delete(userId);
    }
  }

  // 오늘의 보스 도전을 모두 쓴 뒤에 다이아로 추가 도전을 산다(가격은 살 때마다 오르고 하루 최대 횟수가 있다).
  // 횟수가 남아 있을 때는 팔지 않는다 — 날짜가 바뀌면 사라지는 횟수를 미리 사서 낭비하지 않게 하려는 것이다.
  async buyBossAttempt(userId: string) {
    return this.withBossLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      this.resetDailyIfNeeded(gameState);
      const limit = this.bossAttemptLimit(gameState);
      const used = gameState.daily.bossAttempts || 0;
      if (used < limit) {
        throw new BadRequestException(`아직 오늘 도전이 ${limit - used}회 남아 있어요. 모두 쓴 뒤에 살 수 있어요.`);
      }
      const bought = gameState.daily.bossExtraAttempts || 0;
      if (bought >= BOSS_EXTRA_ATTEMPT_COSTS.length) {
        throw new BadRequestException(`오늘 살 수 있는 추가 도전은 ${BOSS_EXTRA_ATTEMPT_COSTS.length}회까지예요.`);
      }
      const cost = BOSS_EXTRA_ATTEMPT_COSTS[bought];
      if (gameState.diamonds < cost) {
        throw new BadRequestException(`다이아가 부족해요. 💎 ${cost}개가 필요해요.`);
      }
      gameState.diamonds -= cost;
      gameState.daily.bossExtraAttempts = bought + 1;
      const message = `보스 타워 추가 도전 1회를 샀어요. (💎 ${cost}개)`;
      this.pushLog(gameState, 'trophy', message);
      await gameState.save();
      return { gameState, message, attemptsLeft: this.bossAttemptLimit(gameState) - used, extra: this.bossExtraInfo(gameState) };
    });
  }

  // 보스 전투 쿨타임을 다이아로 건너뛴다. 남은 시간이 길수록 비싸다. 오늘 도전 횟수가 없으면 건너뛸 이유가 없어서 막는다.
  async skipBossCooldown(userId: string) {
    return this.withBossLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      this.resetDailyIfNeeded(gameState);
      const now = Date.now();
      if (gameState.bossDuel) {
        throw new BadRequestException('직접 전투가 끝난 뒤에 쿨타임을 건너뛸 수 있어요.');
      }
      const readyAt = gameState.cooldowns.get('boss') || 0;
      if (readyAt <= now) {
        throw new BadRequestException('보스 전투 쿨타임이 이미 끝났어요.');
      }
      if ((gameState.daily.bossAttempts || 0) >= this.bossAttemptLimit(gameState)) {
        throw new BadRequestException('오늘 보스 도전 횟수를 모두 썼어요. 쿨타임을 건너뛰어도 도전할 수 없어요.');
      }
      const cost = getBossCooldownSkipCost(readyAt - now);
      if (gameState.diamonds < cost) {
        throw new BadRequestException(`다이아가 부족해요. 💎 ${cost}개가 필요해요.`);
      }
      gameState.diamonds -= cost;
      gameState.cooldowns.set('boss', 0);
      const message = `보스 전투 쿨타임을 건너뛰었어요. (💎 ${cost}개)`;
      this.pushLog(gameState, 'trophy', message);
      await gameState.save();
      return { gameState, message, cost };
    });
  }

  // ---- 서바이벌(무한 전투) ----
  // 진행 중인 런을 서버가 들고 있다가, 입장·버프 선택 때마다 "다음 선택이 필요하거나 쓰러질 때까지"를 한 번에 진행한다.
  private async withSurvivalLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.survivalInFlight.has(userId)) {
      throw new BadRequestException('서바이벌을 진행하는 중이에요. 잠시만 기다려 주세요.');
    }
    this.survivalInFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.survivalInFlight.delete(userId);
    }
  }

  private survivalAttemptLimit(gameState: GameStateDocument) {
    return SURVIVAL_DAILY_ATTEMPTS + (gameState.daily.survivalExtraAttempts || 0);
  }

  private survivalAttemptsLeft(gameState: GameStateDocument) {
    return Math.max(0, this.survivalAttemptLimit(gameState) - (gameState.daily.survivalAttempts || 0));
  }

  private survivalExtraInfo(gameState: GameStateDocument) {
    const bought = gameState.daily.survivalExtraAttempts || 0;
    const max = SURVIVAL_EXTRA_ATTEMPT_COSTS.length;
    return { bought, max, nextCost: bought < max ? SURVIVAL_EXTRA_ATTEMPT_COSTS[bought] : null };
  }

  private toSurvivalState(run: SurvivalRun): SurvivalState {
    return {
      stage: run.stage,
      hp: run.hp,
      baseHp: run.baseHp,
      baseAtk: run.baseAtk,
      baseDef: run.baseDef,
      buffs: { atk: run.buffs.atk, def: run.buffs.def, hp: run.buffs.hp, regen: run.buffs.regen },
    };
  }

  // 화면에 보여줄 현재 런 상태(능력치는 버프까지 반영한 값)
  private toSurvivalRunView(run: SurvivalRun, speciesName: string, duel: ReturnType<GameStateService['toSurvivalDuelView']> = null) {
    const stats = getSurvivalStats(this.toSurvivalState(run));
    return {
      speciesId: run.speciesId,
      speciesName,
      level: run.level,
      stage: run.stage,
      hp: run.hp,
      maxHp: stats.maxHp,
      atk: stats.atk,
      def: stats.def,
      healRate: stats.healRate,
      buffs: { atk: run.buffs.atk, def: run.buffs.def, hp: run.buffs.hp, regen: run.buffs.regen },
      choices: run.choices
        .map((id) => SURVIVAL_BUFFS.find((b) => b.id === id))
        .filter((b): b is (typeof SURVIVAL_BUFFS)[number] => !!b),
      goldEarned: run.goldEarned,
      xpEarned: run.xpEarned,
      diamondsEarned: run.diamondsEarned,
      // 쓰러진 채 부활을 기다리는 중이면 dead이고, 부활할 수 있으면 reviveCost에 가격(💎)이 들어 있다.
      dead: !!run.dead,
      revives: run.revives || 0,
      reviveCost: run.dead ? (SURVIVAL_REVIVE_COSTS[run.revives || 0] ?? null) : null,
      // 'direct'면 엘리트를 직접 전투로 싸우는 런이고, 엘리트와 싸우는 중이면 duel에 전투 상태가 들어 있다.
      mode: run.mode === 'direct' ? ('direct' as const) : ('auto' as const),
      duel,
    };
  }

  async getSurvivalStatus(userId: string) {
    const gameState = await this.getOrThrow(userId);
    this.resetDailyIfNeeded(gameState);
    const run = gameState.survivalRun;
    const species = run ? await this.speciesService.findOne(run.speciesId) : null;
    let duelView: ReturnType<GameStateService['toSurvivalDuelView']> = null;
    if (run && run.duel && species) {
      const enemy = await this.speciesService.findOne(run.duel.enemySpeciesId);
      duelView = this.toSurvivalDuelView(gameState, run, species, enemy);
    }
    return {
      run: run ? this.toSurvivalRunView(run, this.displayNameFor(gameState, run.speciesId, species?.name ?? run.speciesId), duelView) : null,
      attemptsLeft: this.survivalAttemptsLeft(gameState),
      bestStage: gameState.stats.highestSurvivalStage || 0,
      extra: this.survivalExtraInfo(gameState),
    };
  }

  // 식구 한 마리로 입장해서 첫 구간(첫 엘리트를 쓰러뜨리거나 쓰러질 때까지)을 진행한다. 입장 횟수는 여기서 센다.
  async survivalStart(userId: string, speciesId: string, mode: string = 'auto') {
    if (!(SURVIVAL_MODES as readonly string[]).includes(mode)) {
      throw new BadRequestException('알 수 없는 진행 방식이에요.');
    }
    return this.withSurvivalLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      this.resetDailyIfNeeded(gameState);
      if (!(this.totalOf(gameState, speciesId) > 0)) {
        throw new BadRequestException('아직 만나지 못한 식구예요.');
      }
      // 쓰러져서 부활을 기다리던 런은 새로 입장하면 끝난 것으로 본다(이미 받은 보상은 그대로).
      if (gameState.survivalRun && !gameState.survivalRun.dead) {
        throw new BadRequestException('진행 중인 서바이벌이 있어요. 이어서 하거나 포기해 주세요.');
      }
      const used = gameState.daily.survivalAttempts || 0;
      const attemptLimit = this.survivalAttemptLimit(gameState);
      if (used >= attemptLimit) {
        throw new BadRequestException(
          `오늘의 서바이벌 입장 ${attemptLimit}회를 모두 썼어요. 내일 다시 도전하거나 다이아로 추가 입장을 살 수 있어요.`,
        );
      }
      const species = await this.speciesService.findOne(speciesId);
      if (!species) throw new BadRequestException('존재하지 않는 종이에요.');

      // 입장할 때의 능력치(레벨·장비 반영, 개체 편차 포함)를 한 번만 굴려서 런이 끝날 때까지 쓴다.
      const level = getBattleLevel(gameState.battleXp.get(speciesId) || 0);
      const rolled = rollCombatStats(
        species.rarity,
        level,
        Math.random,
        computeEquipmentBonuses(gameState.equipmentSlots, gameState.equipment),
      );
      gameState.daily.survivalAttempts = used + 1;
      gameState.stats.survivalRuns = (gameState.stats.survivalRuns || 0) + 1;
      gameState.survivalRun = {
        speciesId,
        level,
        baseHp: rolled.hp,
        baseAtk: rolled.atk,
        baseDef: rolled.def,
        hp: rolled.hp,
        stage: 0,
        buffs: { atk: 0, def: 0, hp: 0, regen: 0 },
        choices: [],
        goldEarned: 0,
        xpEarned: 0,
        diamondsEarned: 0,
        dead: false,
        revives: 0,
        mode,
        healUsed: false,
        duel: null,
        startedAt: Date.now(),
      };
      return this.advanceSurvival(gameState, species, mode === 'direct' ? '입장(직접 전투)' : '입장');
    });
  }

  // 대기 중인 버프 중 하나를 골라 적용하고 다음 구간을 진행한다.
  async survivalChoose(userId: string, buffId: string) {
    return this.withSurvivalLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const run = gameState.survivalRun;
      if (!run) throw new BadRequestException('진행 중인 서바이벌이 없어요.');
      if (run.dead) throw new BadRequestException('쓰러진 상태예요. 부활하거나 포기해 주세요.');
      if (run.choices.length === 0) throw new BadRequestException('지금은 고를 버프가 없어요.');
      if (!run.choices.includes(buffId)) throw new BadRequestException('제시된 버프 중에서 골라 주세요.');
      const species = await this.speciesService.findOne(run.speciesId);
      if (!species) throw new BadRequestException('존재하지 않는 종이에요.');

      const applied = applySurvivalBuff(this.toSurvivalState(run), buffId as SurvivalBuffId);
      run.hp = applied.hp;
      run.buffs = applied.buffs;
      run.choices = [];
      run.healUsed = false; // 새 구간이 시작되니 직접 전투의 회복을 다시 쓸 수 있다
      const buffName = SURVIVAL_BUFFS.find((b) => b.id === buffId)?.name ?? buffId;
      return this.advanceSurvival(gameState, species, `${buffName} 선택`);
    });
  }

  // 오늘 입장을 모두 쓴 뒤에 다이아로 추가 입장을 산다(가격은 살 때마다 오른다).
  async buySurvivalAttempt(userId: string) {
    return this.withSurvivalLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      this.resetDailyIfNeeded(gameState);
      const left = this.survivalAttemptsLeft(gameState);
      if (left > 0) {
        throw new BadRequestException(`아직 오늘 입장이 ${left}회 남아 있어요. 모두 쓴 뒤에 살 수 있어요.`);
      }
      const bought = gameState.daily.survivalExtraAttempts || 0;
      if (bought >= SURVIVAL_EXTRA_ATTEMPT_COSTS.length) {
        throw new BadRequestException(`오늘 살 수 있는 추가 입장은 ${SURVIVAL_EXTRA_ATTEMPT_COSTS.length}회까지예요.`);
      }
      const cost = SURVIVAL_EXTRA_ATTEMPT_COSTS[bought];
      if (gameState.diamonds < cost) {
        throw new BadRequestException(`다이아가 부족해요. 💎 ${cost}개가 필요해요.`);
      }
      gameState.diamonds -= cost;
      gameState.daily.survivalExtraAttempts = bought + 1;
      const message = `서바이벌 추가 입장 1회를 샀어요. (💎 ${cost}개)`;
      this.pushLog(gameState, 'trophy', message);
      await gameState.save();
      return {
        gameState,
        message,
        attemptsLeft: this.survivalAttemptsLeft(gameState),
        extra: this.survivalExtraInfo(gameState),
      };
    });
  }

  // 쓰러진 런을 다이아로 되살려 같은 스테이지부터 이어간다. 최대 HP의 일부로 돌아오고, 가격은 부활할 때마다 오른다.
  async survivalRevive(userId: string) {
    return this.withSurvivalLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const run = gameState.survivalRun;
      if (!run) throw new BadRequestException('진행 중인 서바이벌이 없어요.');
      if (!run.dead) throw new BadRequestException('쓰러진 상태에서만 부활할 수 있어요.');
      const revives = run.revives || 0;
      const cost = SURVIVAL_REVIVE_COSTS[revives];
      if (cost === undefined) {
        throw new BadRequestException(`한 번의 도전에서는 ${SURVIVAL_REVIVE_COSTS.length}번까지만 부활할 수 있어요.`);
      }
      if (gameState.diamonds < cost) {
        throw new BadRequestException(`다이아가 부족해요. 💎 ${cost}개가 필요해요.`);
      }
      const species = await this.speciesService.findOne(run.speciesId);
      if (!species) throw new BadRequestException('존재하지 않는 종이에요.');

      gameState.diamonds -= cost;
      run.dead = false;
      run.duel = null;
      run.revives = revives + 1;
      run.hp = Math.max(1, Math.round(getSurvivalStats(this.toSurvivalState(run)).maxHp * SURVIVAL_REVIVE_HP_RATE));
      return this.advanceSurvival(gameState, species, `부활(💎 ${cost}개)`);
    });
  }

  // 서바이벌을 그만둔다. 지금까지 깬 스테이지의 보상은 이미 지급됐으니 잃는 것은 없다.
  async survivalRetire(userId: string) {
    return this.withSurvivalLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      const run = gameState.survivalRun;
      if (!run) throw new BadRequestException('진행 중인 서바이벌이 없어요.');
      const stage = run.stage;
      gameState.survivalRun = null;
      const message = `서바이벌을 ${stage}스테이지에서 마쳤어요. 지금까지의 보상은 이미 받았어요.`;
      this.pushLog(gameState, 'leaf', `서바이벌 - ${message}`);
      await gameState.save();
      return {
        gameState,
        message,
        status: 'retired' as const,
        stages: [],
        run: null,
        attemptsLeft: this.survivalAttemptsLeft(gameState),
        summary: { finalStage: stage, bestStage: gameState.stats.highestSurvivalStage || 0, newBest: false, gold: 0, xp: 0, diamonds: 0, equipment: [] },
      };
    });
  }

  // 깬 스테이지들의 보상을 지급한다: 스테이지마다 골드·종 경험치, 이전 최고 기록을 넘은 스테이지에는 5스테이지 단위 다이아와 첫 도달 장비.
  // 자동 모드의 구간 진행과 직접 전투 모드의 엘리트 승리가 같은 규칙을 쓴다.
  private grantSurvivalStageRewards(
    gameState: GameStateDocument,
    species: { speciesId: string },
    wonStages: number[],
  ) {
    const bestBefore = gameState.stats.highestSurvivalStage || 0;
    let best = bestBefore;
    let gold = 0;
    let xp = 0;
    let diamonds = 0;
    const equipment: { itemId: string; name: string; rarity: number; isNew: boolean; copies: number }[] = [];
    for (const stage of wonStages) {
      gold += SURVIVAL_GOLD_BASE + SURVIVAL_GOLD_PER_STAGE * stage;
      xp += SURVIVAL_SPECIES_XP_BASE + SURVIVAL_SPECIES_XP_PER_STAGE * stage;
      if (stage > best) {
        best = stage;
        if (stage % SURVIVAL_MILESTONE_EVERY === 0) diamonds += SURVIVAL_MILESTONE_DIAMONDS;
        const rarity = SURVIVAL_FIRST_REACH_EQUIPMENT[stage];
        if (rarity !== undefined) {
          const picked = pickEquipmentOfRarity(rarity, Math.random());
          const { item, isNew } = this.grantEquipment(gameState, picked.equipmentId);
          equipment.push({ itemId: picked.equipmentId, name: picked.name, rarity: picked.rarity, isNew, copies: item.copies });
        }
      }
    }
    xp = this.boostXp(gameState, xp);
    gameState.coins += gold;
    gameState.stats.earned += gold;
    gameState.diamonds += diamonds;
    gameState.stats.highestSurvivalStage = best;
    const beforeXp = gameState.battleXp.get(species.speciesId) || 0;
    const levelBefore = getBattleLevel(beforeXp);
    gameState.battleXp.set(species.speciesId, beforeXp + xp);
    const levelAfter = getBattleLevel(beforeXp + xp);
    gameState.stats.highestBattleLevel = Math.max(gameState.stats.highestBattleLevel, levelAfter);
    return { bestBefore, best, gold, xp, diamonds, equipment, levelBefore, levelAfter };
  }

  // 화면용 스테이지 요약. 전투 로그는 엘리트와 마지막(패배) 전투에만 담아 응답을 가볍게 한다.
  // fixedEnemy가 있으면 그 스테이지의 적 종을 그대로 쓰고, 없으면 등급에서 무작위로 고른다(표시용).
  private toSurvivalStageViews(
    stages: SurvivalStageResult[],
    maxHp: number,
    speciesList: Species[],
    fixedEnemy?: Map<number, Species>,
  ) {
    return stages.map((st, i) => {
      // 상성을 적용한 전투는 굴린 적 계열에 맞는 종을 보여준다(능력치 보정과 화면의 계열이 어긋나지 않게).
      const enemySpecies =
        fixedEnemy?.get(st.stage) ??
        (st.enemyFamily
          ? pickRandomOfRarityAndFamily(speciesList, st.speciesRarity, st.enemyFamily, Math.random())
          : pickRandomOfRarity(speciesList, st.speciesRarity, Math.random()));
      const keepLog = st.isElite || i === stages.length - 1;
      return {
        stage: st.stage,
        isElite: st.isElite,
        patterns: st.patterns.map((p) => BOSS_PATTERNS[p]),
        enemy: {
          speciesId: enemySpecies.speciesId,
          name: enemySpecies.name,
          image: enemySpecies.image,
          filter: enemySpecies.filter,
          rarity: enemySpecies.rarity,
          stats: st.enemyStats,
          family: st.enemyFamily ?? undefined,
        },
        rules: st.rules ?? null,
        hpBefore: st.hpBefore,
        hpAfter: st.hpAfter,
        maxHp,
        won: st.won,
        log: keepLog ? st.log : [],
      };
    });
  }

  // 저장된 런을 다음 구간까지 진행하고, 이번에 깬 스테이지의 보상을 지급한 뒤 상태를 저장한다.
  // 자동 모드는 엘리트를 쓰러뜨리거나 쓰러질 때까지, 직접 전투 모드는 일반 스테이지를 자동으로 진행하다가 엘리트 앞에서 멈춘다.
  private async advanceSurvival(
    gameState: GameStateDocument,
    species: { speciesId: string; name: string; image?: string; filter?: string; rarity: number; family?: string },
    reason: string,
  ) {
    const run = gameState.survivalRun as SurvivalRun;
    const speciesList = await this.speciesService.findAll();
    const myFamily = resolveFamily(species);
    let stages: SurvivalStageResult[];
    let status: SurvivalSegmentStatus | 'duel';
    let nextState: SurvivalState;
    if (run.mode === 'direct') {
      const segment = playSurvivalUntilElite(this.toSurvivalState(run), Math.random, myFamily);
      stages = segment.stages;
      nextState = segment.state;
      status = segment.status === 'elite' ? 'duel' : 'dead';
    } else {
      const segment = playSurvivalSegment(this.toSurvivalState(run), Math.random, myFamily);
      stages = segment.stages;
      nextState = segment.state;
      status = segment.status;
    }
    const rewards = this.grantSurvivalStageRewards(
      gameState,
      species,
      stages.filter((st) => st.won).map((st) => st.stage),
    );
    run.stage = nextState.stage;
    run.hp = nextState.hp;

    if (status === 'duel') {
      // 다음 스테이지는 엘리트다. 직접 전투를 준비해서 저장하고, 행동을 고를 때까지 기다린다.
      const d = startSurvivalEliteDuel(this.toSurvivalState(run), Math.random, myFamily);
      const enemySpecies = d.enemyFamily
        ? pickRandomOfRarityAndFamily(speciesList, d.speciesRarity, d.enemyFamily, Math.random())
        : pickRandomOfRarity(speciesList, d.speciesRarity, Math.random());
      run.duel = {
        stage: d.stage,
        enemySpeciesId: enemySpecies.speciesId,
        // 상성·환경 보정을 적용한 전투면 적 계열과 환경이 들어 있다(저장되는 적 능력치는 보정이 반영된 값)
        enemyFamily: d.enemyFamily ?? '',
        environment: d.environmentId ?? '',
        mineHp: d.mine.hp,
        enemyHpMax: d.enemyStats.hp,
        enemyAtk: d.enemyStats.atk,
        enemyDef: d.enemyStats.def,
        turn: 1,
        myHp: d.mine.hp,
        enemyHp: d.enemyStats.hp,
        enraged: false,
        charged: false,
        strikeCooldown: 0,
        healUsed: run.healUsed,
        skillCooldown: 0,
        burnTurns: 0,
        rootTurns: 0,
        log: [],
      };
    }
    return this.concludeSurvivalSegment(gameState, species, speciesList, reason, stages, status, rewards);
  }

  // 구간이 끝난 상태(선택 대기·직접 전투 대기·쓰러짐·완주)를 런에 반영하고 저장한 뒤 응답을 만든다.
  // 실제로 이긴 스테이지는 이미 run.stage·run.hp에 반영돼 있어야 한다.
  private async concludeSurvivalSegment(
    gameState: GameStateDocument,
    species: { speciesId: string; name: string; image?: string; filter?: string; rarity: number; family?: string },
    speciesList: Species[],
    reason: string,
    stages: SurvivalStageResult[],
    status: SurvivalSegmentStatus | 'duel',
    rewards: ReturnType<GameStateService['grantSurvivalStageRewards']>,
    fixedEnemy?: Map<number, Species>,
  ) {
    const run = gameState.survivalRun as SurvivalRun;
    const { bestBefore, best, gold, xp, diamonds, equipment, levelBefore, levelAfter } = rewards;
    const displayName = this.displayNameFor(gameState, species.speciesId, species.name);
    const finalStage = run.stage;
    run.goldEarned += gold;
    run.xpEarned += xp;
    run.diamondsEarned += diamonds;

    const duelView = () => {
      const enemy = run.duel ? speciesList.find((s) => s.speciesId === run.duel!.enemySpeciesId) ?? null : null;
      return this.toSurvivalDuelView(gameState, run, species, enemy);
    };
    let message: string;
    let runView: ReturnType<GameStateService['toSurvivalRunView']> | null = null;
    if (status === 'choose') {
      run.choices = rollSurvivalChoices();
      run.duel = null;
      runView = this.toSurvivalRunView(run, displayName);
      message = `엘리트를 쓰러뜨렸어요! ${finalStage}스테이지 돌파 — 버프를 하나 골라 주세요.`;
    } else if (status === 'duel') {
      runView = this.toSurvivalRunView(run, displayName, duelView());
      message = `${finalStage + 1}스테이지 엘리트가 앞을 막고 있어요! 행동을 골라 직접 싸워 보세요.`;
    } else {
      const totals = { gold: run.goldEarned, xp: run.xpEarned, diamonds: run.diamondsEarned };
      const summaryText = `이번 런 +${totals.gold.toLocaleString('ko-KR')} G · 경험치 +${totals.xp}${totals.diamonds ? ` · 💎 ${totals.diamonds}개` : ''}`;
      const reviveCost = SURVIVAL_REVIVE_COSTS[run.revives || 0];
      if (status === 'dead' && reviveCost !== undefined) {
        // 부활할 수 있으면 런을 지우지 않고 쓰러진 채로 남겨 둔다(포기하거나 새로 입장하면 끝난다).
        run.dead = true;
        run.hp = 0;
        run.choices = [];
        run.duel = null;
        runView = this.toSurvivalRunView(run, displayName);
        message = `${displayName}이(가) ${finalStage}스테이지에서 쓰러졌어요. 💎 ${reviveCost}개로 부활하면 이어갈 수 있어요. (${summaryText})`;
      } else {
        gameState.survivalRun = null;
        message =
          status === 'cleared'
            ? `🏆 ${SURVIVAL_MAX_STAGE}스테이지를 모두 돌파했어요! (${summaryText})`
            : `${displayName}이(가) ${finalStage}스테이지에서 쓰러졌어요. ${summaryText}`;
      }
    }
    if (best > bestBefore) message += ` 🆕 최고 기록 ${best}스테이지!`;
    if (equipment.length) message += ` · 🎒 ${equipment.map((e) => e.name).join(', ')} 획득`;
    if (levelAfter > levelBefore) message += ` 🆙 ${displayName}이(가) 전투 Lv.${levelAfter}로 성장했어요!`;
    this.pushLog(gameState, status === 'dead' ? 'leaf' : 'trophy', `서바이벌(${reason}) - ${message}`);

    const mineStats = getSurvivalStats(this.toSurvivalState(run));
    const maxHp = mineStats.maxHp;
    const stageViews = this.toSurvivalStageViews(stages, maxHp, speciesList, fixedEnemy);

    await gameState.save();
    return {
      gameState,
      message,
      status,
      stages: stageViews,
      run: runView,
      // 전투 재생 화면에 쓰는 내 정보(능력치는 이번 구간에 적용된 값 = 버프 반영, HP는 최대 HP)
      mine: {
        speciesId: species.speciesId,
        name: displayName,
        image: species.image,
        filter: species.filter,
        rarity: species.rarity,
        level: run.level,
        stats: { hp: maxHp, atk: mineStats.atk, def: mineStats.def },
      },
      attemptsLeft: this.survivalAttemptsLeft(gameState),
      summary: {
        finalStage,
        bestStage: best,
        newBest: best > bestBefore,
        gold,
        xp,
        diamonds,
        equipment,
      },
    };
  }

  // ---- 서바이벌 엘리트 직접 전투 ----
  private toSurvivalDuelState(duel: SurvivalDuel): BossDuelState {
    return {
      turn: duel.turn,
      myHp: duel.myHp,
      bossHp: duel.enemyHp,
      enraged: duel.enraged,
      charged: duel.charged,
      strikeCooldown: duel.strikeCooldown,
      healUsed: duel.healUsed,
      skillCooldown: duel.skillCooldown ?? 0,
      burnTurns: duel.burnTurns ?? 0,
      rootTurns: duel.rootTurns ?? 0,
    };
  }

  // 저장된 엘리트 직접 전투의 상성·환경 규칙. 적 계열이 저장돼 있지 않으면(상성이 생기기 전에 시작한 전투) null이고,
  // 환경만 비어 있으면(환경이 생기기 전에 시작한 전투) 상성만 적용한 규칙이다.
  private survivalDuelRules(mySpecies: { speciesId: string; family?: string }, duel: SurvivalDuel): BattleRulesView | null {
    if (!duel.enemyFamily) return null;
    const environment = duel.environment ? (duel.environment as BattleEnvironmentId) : null;
    return describeBattleRules(resolveFamily(mySpecies), duel.enemyFamily as SpeciesFamily, environment);
  }

  private toSurvivalDuelView(
    gameState: GameStateDocument,
    run: SurvivalRun,
    mySpecies: { speciesId: string; name: string; image?: string; filter?: string; rarity: number; family?: string },
    enemySpecies: Species | null,
  ) {
    const duel = run.duel;
    if (!duel) return null;
    const stats = getSurvivalStats(this.toSurvivalState(run));
    const info = getSurvivalEnemy(duel.stage);
    // 상성·환경이 적용된 전투(적 계열이 저장돼 있음)면 내 공격·방어에도 보정이 곱해져 있다. 규칙이 생기기 전에 시작한 전투는 보정이 없다.
    const rules = this.survivalDuelRules(mySpecies, duel);
    const enemy = enemySpecies ?? { speciesId: duel.enemySpeciesId, name: '엘리트', image: undefined, filter: '', rarity: info.speciesRarity };
    return {
      stage: duel.stage,
      isElite: true,
      rules,
      ...this.duelCoreView(
        {
          speciesId: mySpecies.speciesId,
          name: this.displayNameFor(gameState, mySpecies.speciesId, mySpecies.name),
          image: mySpecies.image,
          filter: mySpecies.filter ?? '',
          rarity: mySpecies.rarity,
          stats: rules
            ? scaleStatsByMultiplier({ hp: stats.maxHp, atk: stats.atk, def: stats.def }, rules.mine.multiplier)
            : { hp: stats.maxHp, atk: stats.atk, def: stats.def },
          level: run.level,
          family: rules?.mine.family,
        },
        {
          speciesId: enemy.speciesId,
          name: enemy.name,
          image: enemy.image,
          filter: enemy.filter ?? '',
          rarity: enemy.rarity,
          stats: { hp: duel.enemyHpMax, atk: duel.enemyAtk, def: duel.enemyDef },
          level: duel.stage,
          family: rules?.enemy.family,
        },
        info.patterns,
        this.toSurvivalDuelState(duel),
        duel.log as unknown as BattleTurn[],
      ),
    };
  }

  // 엘리트와의 직접 전투를 한 턴 진행한다. 이기면 자동 모드와 같은 보상을 지급하고 버프 선택으로 넘어가며(100스테이지면 완주),
  // 지면 쓰러진 채로 부활을 기다린다. 아직 끝나지 않았으면 status: 'duel'과 갱신된 전투 상태를 돌려준다.
  async survivalDuelAct(userId: string, action: string) {
    if (!(DUEL_ACTIONS as readonly string[]).includes(action)) {
      throw new BadRequestException('알 수 없는 행동이에요.');
    }
    return this.withSurvivalLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const run = gameState.survivalRun;
      const duel = run?.duel;
      if (!run || !duel) throw new BadRequestException('진행 중인 엘리트 직접 전투가 없어요.');
      const species = await this.speciesService.findOne(run.speciesId);
      if (!species) throw new BadRequestException('존재하지 않는 종이에요.');

      const info = getSurvivalEnemy(duel.stage);
      const stats = getSurvivalStats(this.toSurvivalState(run));
      const rules = this.survivalDuelRules(species, duel);
      const mine: CombatStats = rules
        ? scaleStatsByMultiplier({ hp: duel.mineHp, atk: stats.atk, def: stats.def }, rules.mine.multiplier)
        : { hp: duel.mineHp, atk: stats.atk, def: stats.def };
      const enemyStats: CombatStats = { hp: duel.enemyHpMax, atk: duel.enemyAtk, def: duel.enemyDef };
      const state = this.toSurvivalDuelState(duel);
      const status = getDuelActionStates(state).find((a) => a.id === action)!;
      if (!status.available) {
        const name = DUEL_ACTION_INFO.find((a) => a.id === action)?.name ?? action;
        throw new BadRequestException(`${name}은(는) 지금 쓸 수 없어요. ${status.reason ?? ''}`.trim());
      }

      const r = playDuelTurn(mine, enemyStats, info.patterns, state, action as DuelAction, Math.random, {
        healCapHp: stats.maxHp,
        skill: this.duelSkillOf(species),
      });
      const log = [...(duel.log as unknown as BattleTurn[]), ...r.turns];
      const speciesList = await this.speciesService.findAll();
      const enemySpecies = speciesList.find((s) => s.speciesId === duel.enemySpeciesId) ?? null;

      if (!r.winner) {
        duel.turn = r.state.turn;
        duel.myHp = r.state.myHp;
        duel.enemyHp = r.state.bossHp;
        duel.enraged = r.state.enraged;
        duel.charged = r.state.charged;
        duel.strikeCooldown = r.state.strikeCooldown;
        duel.healUsed = r.state.healUsed;
        duel.skillCooldown = r.state.skillCooldown ?? 0;
        duel.burnTurns = r.state.burnTurns ?? 0;
        duel.rootTurns = r.state.rootTurns ?? 0;
        duel.log = log as unknown as Record<string, unknown>[];
        await gameState.save();
        const displayName = this.displayNameFor(gameState, run.speciesId, species.name);
        return {
          gameState,
          message: '',
          step: true as const, // 엘리트 전투 중간 응답(전투가 끝난 응답에는 없다)
          status: 'duel' as const,
          stages: [],
          run: this.toSurvivalRunView(run, displayName, this.toSurvivalDuelView(gameState, run, species, enemySpecies)),
          turns: r.turns,
          attemptsLeft: this.survivalAttemptsLeft(gameState),
        };
      }

      // 전투가 끝났다. 이긴 경우 이 스테이지를 깬 것으로 치고(자동 모드와 같은 회복·보상), 진 경우 쓰러진다.
      const won = r.winner === 'me';
      const stage = duel.stage;
      const hpBefore = duel.mineHp;
      run.healUsed = r.state.healUsed;
      run.duel = null;
      let hpAfter = 0;
      if (won) {
        const next = finishSurvivalEliteWin(this.toSurvivalState(run), r.state.myHp);
        run.stage = next.stage;
        run.hp = next.hp;
        hpAfter = next.hp;
      }
      const rewards = this.grantSurvivalStageRewards(gameState, species, won ? [stage] : []);
      const stageResult: SurvivalStageResult = {
        stage,
        isElite: true,
        patterns: info.patterns,
        enemyStats,
        speciesRarity: info.speciesRarity,
        hpBefore,
        hpAfter,
        won,
        log,
        enemyFamily: rules?.enemy.family,
        rules,
      };
      const outcome: SurvivalSegmentStatus = !won ? 'dead' : stage >= SURVIVAL_MAX_STAGE ? 'cleared' : 'choose';
      const fixed = enemySpecies ? new Map<number, Species>([[stage, enemySpecies]]) : undefined;
      return this.concludeSurvivalSegment(gameState, species, speciesList, '엘리트 직접 전투', [stageResult], outcome, rewards, fixed);
    });
  }

  // ---- 오늘의 퍼즐 ----
  // 판과 이동 검증은 puzzle-engine.ts의 순수 계산이다. 여기서는 기록(puzzle_records)·보상·순위를 다룬다.
  private get puzzles(): Model<PuzzleRecordDocument> {
    if (!this.puzzleRecordModel) throw new Error('PuzzleRecord 모델이 연결되지 않았어요.');
    return this.puzzleRecordModel;
  }

  private async withPuzzleLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.puzzleInFlight.has(userId)) {
      throw new BadRequestException('처리 중이에요. 잠시만 기다려 주세요.');
    }
    this.puzzleInFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.puzzleInFlight.delete(userId);
    }
  }

  // 그날 이 유저의 기록. 한 단계도 못 깬 기록(단계가 생기기 전의 옛 기록 포함)은 없는 것으로 본다.
  private async puzzleRecordOf(dayKey: string, userId: string) {
    const rec = await this.puzzles
      .findOne({ dayKey, userId: new Types.ObjectId(userId) })
      .lean<{ stageBest?: number[]; cleared?: number; excess?: number }>();
    if (!rec || !(rec.cleared && rec.cleared > 0)) return null;
    const stageBest = Array.from({ length: PUZZLE_STAGES }, (_, i) => rec.stageBest?.[i] ?? 0);
    return { stageBest, cleared: rec.cleared, excess: rec.excess ?? 0 };
  }

  // 그날 이 성적보다 나은 사람 수 + 1 = 순위(같은 성적은 같은 순위)와, 그날 한 단계라도 깬 사람 수
  private async puzzleRankOf(dayKey: string, score: { cleared: number; excess: number }) {
    const [better, participants] = await Promise.all([
      this.puzzles.countDocuments({
        dayKey,
        $or: [{ cleared: { $gt: score.cleared } }, { cleared: score.cleared, excess: { $lt: score.excess } }],
      }),
      this.puzzles.countDocuments({ dayKey, cleared: { $gte: 1 } }),
    ]);
    return { rank: better + 1, participants };
  }

  // 어제 퍼즐을 푼 유저의 순위 보상. 어제 한 단계도 못 깼으면 null이다. 그날이 끝나서 기록이 더는 바뀌지 않으니 지금 계산해도 확정된 값이다.
  private async puzzleYesterday(gameState: GameStateDocument, userId: string, today: string) {
    const dayKey = getPreviousPuzzleDayKey(today);
    const record = await this.puzzleRecordOf(dayKey, userId);
    if (!record) return null;
    const { rank, participants } = await this.puzzleRankOf(dayKey, record);
    return {
      dayKey,
      cleared: record.cleared,
      excess: record.excess,
      rank,
      participants,
      diamonds: getPuzzleRankReward(rank),
      claimed: gameState.puzzle?.rankClaimedDay === dayKey,
    };
  }

  private puzzleView(dayKey: string, stage: number) {
    const p = getPuzzleStage(dayKey, stage);
    return { dayKey, stage, width: p.width, height: p.height, rocks: p.rocks, start: p.start, goal: p.goal, par: p.par };
  }

  // 오늘의 퍼즐 화면에 필요한 모든 것: 고른 단계의 판(기본은 지금 도전할 단계), 단계별 기록, 내 순위, 어제 순위 보상, 보상표.
  // 아직 열리지 않은 단계의 판과 최단 수는 내려주지 않는다.
  async getPuzzle(userId: string, stageParam?: number) {
    const gameState = await this.getOrThrow(userId);
    const dayKey = getPuzzleDayKey();
    const record = await this.puzzleRecordOf(dayKey, userId);
    const cleared = record?.cleared ?? 0;
    const open = Math.min(cleared + 1, PUZZLE_STAGES); // 지금 도전할 수 있는 가장 높은 단계
    const stage = stageParam ?? open;
    if (!Number.isInteger(stage) || stage < 1 || stage > PUZZLE_STAGES) {
      throw new BadRequestException('없는 단계예요.');
    }
    if (stage > open) throw new BadRequestException('앞 단계를 먼저 깨야 열려요.');
    const progress = gameState.puzzle?.dayKey === dayKey ? gameState.puzzle : null;
    const stages = Array.from({ length: PUZZLE_STAGES }, (_, i) => {
      const n = i + 1;
      const unlocked = n <= open;
      const par = unlocked ? getPuzzleStage(dayKey, n).par : null;
      const best = record?.stageBest[i] ?? 0;
      return {
        stage: n,
        unlocked,
        par,
        bestMoves: best > 0 ? best : null,
        stars: best > 0 && par !== null ? getPuzzleStars(par, best) : 0,
        rewardedStars: progress?.stageStars?.[i] ?? 0,
      };
    });
    let today: { cleared: number; excess: number; rank: number; participants: number } | null = null;
    if (record) {
      const { rank, participants } = await this.puzzleRankOf(dayKey, record);
      today = { cleared: record.cleared, excess: record.excess, rank, participants };
    }
    return {
      puzzle: this.puzzleView(dayKey, stage),
      openStage: open,
      allCleared: cleared >= PUZZLE_STAGES,
      stages,
      resetsAt: getPuzzleResetAt(dayKey),
      maxMoves: PUZZLE_MAX_MOVES,
      milestoneReached: progress?.milestone ?? 0,
      today,
      yesterday: await this.puzzleYesterday(gameState, userId, dayKey),
      rules: {
        stageCount: PUZZLE_STAGES,
        star2Margin: PUZZLE_STAR2_MARGIN,
        stageShards: PUZZLE_STAGE_STAR_SHARDS, // 인덱스 = 그 단계에서 딴 별 수, 값 = 받는 장비 조각(차액 지급)
        milestones: PUZZLE_MILESTONES,
        rankRewards: PUZZLE_RANK_REWARDS,
      },
    };
  }

  // 이동 기록을 제출한다. 서버가 시작 칸부터 그대로 굴려 보고 나뭇잎에 도착하면 그 단계 클리어로 인정한다.
  // 그 단계의 최소 이동 수를 갱신하고, 새로 딴 별과 새로 달성한 단계 수만큼 보상을 준다.
  async puzzleSubmit(userId: string, dayKey: string, stage: number, moves: string) {
    return this.withPuzzleLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const today = getPuzzleDayKey();
      if (dayKey !== today) {
        throw new BadRequestException('퍼즐이 새로 바뀌었어요. 화면을 새로고침해 주세요.');
      }
      if (!Number.isInteger(stage) || stage < 1 || stage > PUZZLE_STAGES) {
        throw new BadRequestException('없는 단계예요.');
      }
      const record = await this.puzzleRecordOf(today, userId);
      const beforeScore = { cleared: record?.cleared ?? 0, excess: record?.excess ?? 0 };
      if (stage > beforeScore.cleared + 1) throw new BadRequestException('앞 단계를 먼저 깨야 열려요.');

      const puzzle = getPuzzleStage(today, stage);
      const replay = replayPuzzleMoves(puzzle, moves);
      if (!replay.ok) {
        const reasons = {
          format: '이동 기록이 올바르지 않아요.',
          'too-long': `한 번에 최대 ${PUZZLE_MAX_MOVES}번까지 이동할 수 있어요.`,
          'not-solved': '나뭇잎에 도착하지 못한 기록이에요.',
          trailing: '나뭇잎에 도착한 뒤의 이동이 섞여 있어요.',
        } as const;
        throw new BadRequestException(reasons[replay.reason]);
      }

      // 기록: 이 단계에서 더 적은 수로 깼을 때만 갱신하고, 오늘의 성적(많이 깬 순 → 초과분이 적은 순)이 좋아지면 달성 시각을 새로 적는다.
      const stageBest = record?.stageBest ?? Array.from({ length: PUZZLE_STAGES }, () => 0);
      const previous = stageBest[stage - 1];
      const improved = previous === 0 || replay.moves < previous;
      if (improved) stageBest[stage - 1] = replay.moves;
      const score = computePuzzleScore(today, stageBest);
      const scoreImproved = comparePuzzleScore(score, beforeScore) < 0;
      const now = new Date();
      await this.puzzles.updateOne(
        { dayKey: today, userId: new Types.ObjectId(userId) },
        {
          $set: {
            stageBest,
            cleared: score.cleared,
            excess: score.excess,
            expireAt: new Date(getPuzzleResetAt(today) + 45 * 24 * 60 * 60 * 1000),
            ...(scoreImproved ? { reachedAt: now } : {}),
          },
          $inc: { solves: 1 },
        },
        { upsert: true },
      );
      const bestForStage = stageBest[stage - 1];

      // 보상: 이 단계에서 이미 받은 별 보상보다 높은 별을 땄을 때만 차액을, 새로 달성한 단계 수 보너스를 한 번씩 준다.
      // 받은 기록은 게임 상태와 한 번에 저장된다.
      const stars = getPuzzleStars(puzzle.par, replay.moves);
      const prev = gameState.puzzle;
      const keepDay = prev?.dayKey === today;
      const stageStars = Array.from({ length: PUZZLE_STAGES }, (_, i) => (keepDay ? (prev?.stageStars?.[i] ?? 0) : 0));
      let milestone = keepDay ? (prev?.milestone ?? 0) : 0;
      const stageReward = getPuzzleStageRewardGain(stageStars[stage - 1], stars);
      if (stars > stageStars[stage - 1]) stageStars[stage - 1] = stars;
      const newMilestones = PUZZLE_MILESTONES.filter((m) => m.stages <= score.cleared && m.stages > milestone);
      for (const m of newMilestones) milestone = Math.max(milestone, m.stages);
      const reward = newMilestones.reduce((sum, m) => addPuzzleRewards(sum, m.reward), stageReward);
      gameState.explorationTickets += reward.explorationTickets;
      gameState.equipmentShards = (gameState.equipmentShards || 0) + reward.equipmentShards;
      gameState.diamonds += reward.diamonds;
      gameState.puzzle = { dayKey: today, stageStars, milestone, rankClaimedDay: prev?.rankClaimedDay ?? '' };

      const rewardText = [
        reward.explorationTickets ? `🎟️ 탐색권 ${reward.explorationTickets}장` : '',
        reward.equipmentShards ? `🔩 장비 조각 ${reward.equipmentShards}개` : '',
        reward.diamonds ? `💎 ${reward.diamonds}개` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      const message = `오늘의 퍼즐 ${stage}단계 클리어! ${replay.moves}수 ${'★'.repeat(stars)}${rewardText ? ` — ${rewardText}` : ''}${
        newMilestones.length ? ` (🎉 ${newMilestones[newMilestones.length - 1].stages}단계 달성 보너스 포함)` : ''
      }${!improved ? ` (이 단계 최고 기록은 ${bestForStage}수예요)` : ''}`;
      if (improved || rewardText) this.pushLog(gameState, 'trophy', message);
      await gameState.save();

      const { rank, participants } = await this.puzzleRankOf(today, score);
      return {
        gameState,
        message,
        stage,
        moves: replay.moves,
        stars,
        par: puzzle.par,
        improved,
        stageBest: bestForStage,
        bestStars: getPuzzleStars(puzzle.par, bestForStage),
        cleared: score.cleared,
        excess: score.excess,
        nextStage: score.cleared >= PUZZLE_STAGES ? null : score.cleared + 1,
        allCleared: score.cleared >= PUZZLE_STAGES,
        rank,
        participants,
        reward,
        stageReward,
        milestones: newMilestones,
      };
    });
  }

  // 어제 퍼즐 순위 보상을 받는다(어제 한 단계라도 깬 사람만, 한 번만). 어제보다 오래된 보상은 받을 수 없다.
  async puzzleClaimRank(userId: string) {
    return this.withPuzzleLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const yesterday = await this.puzzleYesterday(gameState, userId, getPuzzleDayKey());
      if (!yesterday) throw new BadRequestException('어제 퍼즐을 깬 기록이 없어요.');
      if (yesterday.claimed) throw new BadRequestException('이미 어제 순위 보상을 받았어요.');
      if (yesterday.diamonds <= 0) throw new BadRequestException('받을 수 있는 순위 보상이 없어요.');
      gameState.diamonds += yesterday.diamonds;
      const prev = gameState.puzzle;
      gameState.puzzle = {
        dayKey: prev?.dayKey ?? '',
        stageStars: prev?.stageStars ? [...prev.stageStars] : [],
        milestone: prev?.milestone ?? 0,
        rankClaimedDay: yesterday.dayKey,
      };
      const message = `어제 퍼즐 ${yesterday.rank}위 보상! 💎 ${yesterday.diamonds}개`;
      this.pushLog(gameState, 'trophy', message);
      await gameState.save();
      return { gameState, message, diamonds: yesterday.diamonds, rank: yesterday.rank };
    });
  }

  // ---- 콩 달리기 ----
  // 게임 진행은 클라이언트가 그리지만, 점수는 서버가 점프한 틱 목록으로 같은 시뮬레이션(runner-engine.ts)을 처음부터 다시 돌려서 정한다.
  private get runners(): Model<RunnerRecordDocument> {
    if (!this.runnerRecordModel) throw new Error('RunnerRecord 모델이 연결되지 않았어요.');
    return this.runnerRecordModel;
  }

  private async withRunnerLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.runnerInFlight.has(userId)) {
      throw new BadRequestException('처리 중이에요. 잠시만 기다려 주세요.');
    }
    this.runnerInFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.runnerInFlight.delete(userId);
    }
  }

  // 그날 이 기록보다 멀리 달린 사람 수 + 1 = 순위(같은 거리는 같은 순위)와 그날 달린 사람 수
  private async runnerRankOf(dayKey: string, bestMeters: number) {
    const [better, participants] = await Promise.all([
      this.runners.countDocuments({ dayKey, bestMeters: { $gt: bestMeters } }),
      this.runners.countDocuments({ dayKey }),
    ]);
    return { rank: better + 1, participants };
  }

  private runnerProgressOf(gameState: GameStateDocument) {
    const p = gameState.runner;
    return {
      run: p?.run
        ? { seed: p.run.seed, startedAt: p.run.startedAt, speciesId: p.run.speciesId ?? '', rarity: p.run.rarity ?? 0 }
        : null,
      dayKey: p?.dayKey ?? '',
      milestone: p?.milestone ?? 0,
      bestMeters: p?.bestMeters ?? 0,
    };
  }

  // 콩 달리기 화면에 필요한 것: 오늘의 기록과 순위, 최고 기록, 오늘 받은 보너스, 규칙
  async getRunner(userId: string) {
    const gameState = await this.getOrThrow(userId);
    const dayKey = getPuzzleDayKey();
    const progress = this.runnerProgressOf(gameState);
    const record = await this.runners
      .findOne({ dayKey, userId: new Types.ObjectId(userId) })
      .lean<{ bestMeters: number }>();
    const today = record ? { bestMeters: record.bestMeters, ...(await this.runnerRankOf(dayKey, record.bestMeters)) } : null;
    return {
      dayKey,
      today,
      bestMeters: progress.bestMeters,
      milestoneReached: progress.dayKey === dayKey ? progress.milestone : 0,
      resetsAt: getPuzzleResetAt(dayKey),
      rules: {
        tps: RUNNER_TPS,
        maxTicks: RUNNER_MAX_TICKS,
        milestones: RUNNER_MILESTONES,
        abilities: RUNNER_ABILITIES_BY_RARITY, // 인덱스 = 희귀도
        invulnTicks: RUNNER_INVULN_TICKS,
        airJumpPercent: RUNNER_AIR_JUMP_PERCENT,
      },
    };
  }

  // 새로 달리기를 시작한다. 내보낼 콩벌레(가지고 있는 종)를 고르면, 서버가 시드를 정해서 주고(곰팡이 배치가 매번 달라진다)
  // 시작 시각과 그 콩벌레의 희귀도(= 능력)를 적어 둔다. 끝내지 않은 이전 판이 있으면 버린다(기록되지 않는다).
  async runnerStart(userId: string, speciesId: string) {
    return this.withRunnerLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const species = await this.speciesService.findOne(speciesId);
      if (!species) throw new BadRequestException('존재하지 않는 종이에요.');
      if (!(this.totalOf(gameState, speciesId) > 0)) {
        throw new BadRequestException('아직 만나지 못한 식구예요.');
      }
      const seed = randomBytes(4).readUInt32BE(0);
      const prev = this.runnerProgressOf(gameState);
      gameState.runner = { ...prev, run: { seed, startedAt: Date.now(), speciesId, rarity: species.rarity } };
      await gameState.save();
      return { seed, maxTicks: RUNNER_MAX_TICKS, speciesId, rarity: species.rarity };
    });
  }

  // 달리기를 마친다. 점프한 틱 목록으로 서버가 처음부터 다시 돌려서 거리를 정하고, 실제로 흐른 시간보다 긴 기록은 거절한다.
  async runnerFinish(userId: string, jumps: number[]) {
    return this.withRunnerLock(userId, async () => {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      const progress = this.runnerProgressOf(gameState);
      const run = progress.run;
      if (!run) throw new BadRequestException('진행 중인 달리기가 없어요. 새로 시작해 주세요.');
      const now = Date.now();
      const elapsed = now - run.startedAt;
      if (elapsed > RUNNER_RUN_EXPIRE_MS) {
        gameState.runner = { ...progress, run: null };
        await gameState.save();
        throw new BadRequestException('시작한 지 너무 오래된 달리기라 무효예요. 새로 시작해 주세요.');
      }
      if (!isValidRunnerJumps(jumps)) throw new BadRequestException('점프 기록이 올바르지 않아요.');
      const result = simulateRunner(run.seed, jumps, run.rarity);
      if (!isRunnerTimePlausible(result.ticks, elapsed)) {
        throw new BadRequestException('기록이 실제로 달린 시간보다 길어요. 다시 달려 주세요.');
      }

      // 기록: 오늘 최고 기록(미터)을 넘었을 때만 갱신한다.
      const today = getPuzzleDayKey();
      const uid = new Types.ObjectId(userId);
      const meters = result.meters;
      const before = await this.runners.findOne({ dayKey: today, userId: uid }).lean<{ bestMeters: number }>();
      const expireAt = new Date(getPuzzleResetAt(today) + 45 * 24 * 60 * 60 * 1000);
      if (!before) {
        await this.runners.create({ dayKey: today, userId: uid, bestMeters: meters, bestAt: new Date(now), speciesId: run.speciesId, runs: 1, expireAt });
      } else {
        await this.runners.updateOne({ dayKey: today, userId: uid }, { $inc: { runs: 1 } });
        if (meters > before.bestMeters) {
          await this.runners.updateOne({ dayKey: today, userId: uid }, { $set: { bestMeters: meters, bestAt: new Date(now), speciesId: run.speciesId } });
        }
      }
      const bestToday = Math.max(meters, before?.bestMeters ?? 0);
      const improved = !before || meters > before.bestMeters;

      // 보상: 오늘 최고 기록이 새로 닿은 거리 보너스를 한 번씩 준다. 받은 기록은 게임 상태와 한 번에 저장된다.
      const reachedCount = RUNNER_MILESTONES.filter((m) => m.meters <= bestToday).length;
      const alreadyCount = progress.dayKey === today ? progress.milestone : 0;
      const newMilestones = RUNNER_MILESTONES.slice(alreadyCount, reachedCount);
      const reward = newMilestones.reduce(
        (sum, m) => ({
          explorationTickets: sum.explorationTickets + m.reward.explorationTickets,
          equipmentShards: sum.equipmentShards + m.reward.equipmentShards,
          diamonds: sum.diamonds + m.reward.diamonds,
        }),
        { explorationTickets: 0, equipmentShards: 0, diamonds: 0 },
      );
      gameState.explorationTickets += reward.explorationTickets;
      gameState.equipmentShards = (gameState.equipmentShards || 0) + reward.equipmentShards;
      gameState.diamonds += reward.diamonds;
      const newAllTimeBest = meters > progress.bestMeters;
      gameState.runner = {
        run: null,
        dayKey: today,
        milestone: Math.max(alreadyCount, reachedCount),
        bestMeters: Math.max(progress.bestMeters, meters),
      };

      const rewardText = [
        reward.explorationTickets ? `🎟️ 탐색권 ${reward.explorationTickets}장` : '',
        reward.equipmentShards ? `🔩 장비 조각 ${reward.equipmentShards}개` : '',
        reward.diamonds ? `💎 ${reward.diamonds}개` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      const message = `콩 달리기 ${meters}m!${result.completed ? ' 🏆 끝까지 완주!' : ''}${newAllTimeBest ? ' 🆕 최고 기록!' : ''}${rewardText ? ` — ${rewardText}` : ''}`;
      if (improved || rewardText) this.pushLog(gameState, 'trophy', message);
      await gameState.save();

      const { rank, participants } = await this.runnerRankOf(today, bestToday);
      return {
        gameState,
        message,
        meters,
        ticks: result.ticks,
        completed: result.completed,
        speciesId: run.speciesId,
        rarity: run.rarity,
        shieldsUsed: result.shieldsUsed,
        improved,
        bestToday,
        bestMeters: Math.max(progress.bestMeters, meters),
        newAllTimeBest,
        rank,
        participants,
        reward,
        milestones: newMilestones,
      };
    });
  }

  // ---- 장비 ----
  private findEquipment(gameState: GameStateDocument, itemId: string) {
    const item = gameState.equipment.find((e) => e.itemId === itemId);
    if (!item || !EQUIPMENT_BY_ID.has(itemId)) {
      throw new BadRequestException('보유하지 않은 장비예요.');
    }
    return item;
  }

  // 장비 1개를 지급한다. 처음 얻으면 새로 만들고, 이미 있으면 복사본(copies)만 1 늘린다.
  private grantEquipment(gameState: GameStateDocument, equipmentId: string) {
    let item = gameState.equipment.find((e) => e.itemId === equipmentId);
    const isNew = !item;
    if (item) {
      item.copies += 1;
    } else {
      gameState.equipment.push({
        itemId: equipmentId,
        copies: 0,
        level: 1,
        maxLevel: EQUIPMENT_BASE_MAX_LEVEL,
        awakenCount: 0,
        awakenFailures: 0,
      });
      item = gameState.equipment[gameState.equipment.length - 1];
    }
    return { item, isNew };
  }

  // 다이아로 장비를 뽑는다. 10연차는 마지막에 희귀 이상이 하나도 없으면 희귀 이상으로 보장하고,
  // 전설 이상이 50회 연속 안 나오면 50번째는 전설 이상을 확정으로 준다.
  async pullEquipment(userId: string, count: number) {
    if (count !== 1 && count !== 10) {
      throw new BadRequestException('1회 또는 10연차만 뽑을 수 있어요.');
    }
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    const cost = count === 10 ? EQUIPMENT_PULL10_COST : EQUIPMENT_PULL_COST;
    if (gameState.diamonds < cost) {
      throw new BadRequestException(`장비 뽑기에는 💎 ${cost}개가 필요해요.`);
    }
    gameState.diamonds -= cost;

    let pity = gameState.equipmentPity;
    let gotRarePlus = false;
    const results: { itemId: string; isNew: boolean; copies: number; level: number }[] = [];
    for (let i = 0; i < count; i++) {
      const forceTop = pity + 1 >= EQUIPMENT_PITY_LIMIT;
      const forceRare = count === 10 && i === count - 1 && !gotRarePlus;
      const rarity = rollEquipmentRarity(Math.random(), forceTop ? 3 : forceRare ? 1 : 0);
      const picked = pickEquipmentOfRarity(rarity, Math.random());
      pity = rarity >= 3 ? 0 : pity + 1;
      if (rarity >= 1) gotRarePlus = true;

      const { item, isNew } = this.grantEquipment(gameState, picked.equipmentId);
      results.push({
        itemId: picked.equipmentId,
        isNew,
        copies: item.copies,
        level: item.level,
      });
    }
    gameState.equipmentPity = pity;
    gameState.stats.equipmentPulls += count;

    const best = results.reduce((a, b) =>
      (EQUIPMENT_BY_ID.get(b.itemId)?.rarity ?? 0) > (EQUIPMENT_BY_ID.get(a.itemId)?.rarity ?? 0) ? b : a,
    );
    const bestName = EQUIPMENT_BY_ID.get(best.itemId)?.name ?? best.itemId;
    const message = `장비 뽑기 ${count === 10 ? '10연차' : '1회'} 완료! 가장 좋은 건 ${RARITIES[EQUIPMENT_BY_ID.get(best.itemId)?.rarity ?? 0].name} ${bestName}. -💎 ${cost}`;
    this.pushLog(gameState, 'diamond', message);

    await gameState.save();
    return { gameState, message, results, cost };
  }

  // 같은 장비를 레벨 수치만큼 중복으로 모았으면 레벨업한다(그 개수는 소모된다).
  async levelUpEquipment(userId: string, itemId: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    const item = this.findEquipment(gameState, itemId);
    if (item.level >= item.maxLevel) {
      throw new BadRequestException('이미 최대 레벨이에요. 각성하면 더 키울 수 있어요.');
    }
    const needed = getEquipmentLevelUpCopies(item.level);
    if (item.copies < needed) {
      throw new BadRequestException(
        `레벨업에는 같은 장비를 ${needed}개 더 모아야 해요. (지금 ${item.copies}개)`,
      );
    }
    item.copies -= needed;
    item.level += 1;

    const name = EQUIPMENT_BY_ID.get(itemId)?.name ?? itemId;
    const message = `${name}이(가) Lv.${item.level}로 올랐어요!`;
    this.pushLog(gameState, 'sprout', message);
    await gameState.save();
    return { gameState, message };
  }

  // 쓰지 않는 중복 장비(복사본)를 분해해서 장비 조각을 얻는다. 처음 얻은 1개(장비 자체)는 분해되지 않는다.
  // itemId를 주면 그 장비의 복사본(개수를 주지 않으면 전부)을, 주지 않으면 장착하지 않은 모든 장비의 복사본을 분해한다.
  async dismantleEquipment(userId: string, itemId?: string, count?: number) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    const targets: { item: (typeof gameState.equipment)[number]; n: number }[] = [];
    if (itemId) {
      const item = this.findEquipment(gameState, itemId);
      if (item.copies < 1) throw new BadRequestException('분해할 중복 장비가 없어요.');
      const n = count ?? item.copies;
      if (n > item.copies) {
        throw new BadRequestException(`분해할 수 있는 중복은 ${item.copies}개뿐이에요.`);
      }
      targets.push({ item, n });
    } else {
      if (count !== undefined) {
        throw new BadRequestException('모두 분해할 때는 개수를 정할 수 없어요.');
      }
      const equipped = new Set(gameState.equipmentSlots);
      for (const item of gameState.equipment) {
        if (!EQUIPMENT_BY_ID.has(item.itemId) || equipped.has(item.itemId) || item.copies < 1) continue;
        targets.push({ item, n: item.copies });
      }
      if (targets.length === 0) {
        throw new BadRequestException('분해할 중복 장비가 없어요. (장착 중인 장비의 중복은 건드리지 않아요.)');
      }
    }

    let gained = 0;
    const dismantled: { itemId: string; name: string; count: number; shards: number }[] = [];
    for (const { item, n } of targets) {
      const def = EQUIPMENT_BY_ID.get(item.itemId)!;
      const shards = n * (EQUIPMENT_SHARDS_PER_COPY[def.rarity] ?? EQUIPMENT_SHARDS_PER_COPY[0]);
      item.copies -= n;
      gained += shards;
      dismantled.push({ itemId: item.itemId, name: def.name, count: n, shards });
    }
    gameState.equipmentShards = (gameState.equipmentShards || 0) + gained;
    const total = dismantled.reduce((a, d) => a + d.count, 0);
    const message = `중복 장비 ${total}개를 분해해서 조각 ${gained.toLocaleString('ko-KR')}개를 얻었어요. (보유 ${gameState.equipmentShards.toLocaleString('ko-KR')}개)`;
    this.pushLog(gameState, 'sprout', message);
    await gameState.save();
    return { gameState, message, gained, shards: gameState.equipmentShards, dismantled };
  }

  // 레벨업에 모자란 중복(복사본)을 조각과 골드로 메꿔서 레벨업한다. 이미 모은 복사본은 먼저 쓰고, 모자란 만큼에만 비용이 든다.
  async levelUpEquipmentWithShards(userId: string, itemId: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    const item = this.findEquipment(gameState, itemId);
    const def = EQUIPMENT_BY_ID.get(itemId)!;
    if (item.level >= item.maxLevel) {
      throw new BadRequestException('이미 최대 레벨이에요. 각성하면 더 키울 수 있어요.');
    }
    const cost = getShardLevelUpCost(def.rarity, item.level, item.copies);
    if (cost.missing === 0) {
      throw new BadRequestException('중복이 충분해요. 조각 없이 바로 레벨업할 수 있어요.');
    }
    const owned = gameState.equipmentShards || 0;
    if (owned < cost.shards) {
      throw new BadRequestException(
        `조각이 모자라요. ${cost.shards.toLocaleString('ko-KR')}개가 필요해요. (지금 ${owned.toLocaleString('ko-KR')}개)`,
      );
    }
    if (gameState.coins < cost.gold) {
      throw new BadRequestException(`레벨업에는 ${cost.gold.toLocaleString('ko-KR')} G가 필요해요.`);
    }
    gameState.equipmentShards = owned - cost.shards;
    gameState.coins -= cost.gold;
    item.copies = 0; // 모자라서 조각으로 메꿨으니 모아 둔 복사본은 전부 쓴다
    item.level += 1;

    const message = `${def.name}이(가) Lv.${item.level}로 올랐어요! (조각 ${cost.shards.toLocaleString('ko-KR')}개 · ${cost.gold.toLocaleString('ko-KR')} G)`;
    this.pushLog(gameState, 'sprout', message);
    await gameState.save();
    return { gameState, message, shardsUsed: cost.shards, goldUsed: cost.gold, copiesFilled: cost.missing };
  }

  // 최대 레벨 장비를 골드로 각성한다. 성공하면 최대 레벨 +3, 효과 +5%. 실패하면 골드는 사라지고
  // 다음 성공 확률이 5%p 올라간다(성공하면 확률은 처음으로 돌아간다).
  async awakenEquipment(userId: string, itemId: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    const item = this.findEquipment(gameState, itemId);
    const def = EQUIPMENT_BY_ID.get(itemId)!;
    if (item.level < item.maxLevel) {
      throw new BadRequestException('최대 레벨에 도달해야 각성할 수 있어요.');
    }
    if (item.awakenCount >= EQUIPMENT_MAX_AWAKENINGS) {
      throw new BadRequestException('더 이상 각성할 수 없어요.');
    }
    const cost = getAwakenCost(def.rarity, item.awakenCount);
    if (gameState.coins < cost) {
      throw new BadRequestException(`각성에는 ${cost.toLocaleString('ko-KR')} G가 필요해요.`);
    }
    gameState.coins -= cost;

    const chance = getAwakenSuccessChance(item.awakenFailures);
    const success = Math.random() < chance;
    let message: string;
    if (success) {
      item.maxLevel += EQUIPMENT_AWAKEN_LEVEL_GAIN;
      item.awakenCount += 1;
      item.awakenFailures = 0;
      message = `✨ ${def.name} 각성 성공! 최대 레벨이 ${item.maxLevel}로 늘고 효과가 강해졌어요. -${cost.toLocaleString('ko-KR')} G`;
    } else {
      item.awakenFailures += 1;
      const nextChance = Math.round(getAwakenSuccessChance(item.awakenFailures) * 100);
      message = `${def.name} 각성에 실패했어요... -${cost.toLocaleString('ko-KR')} G · 다음 성공 확률 ${nextChance}%`;
    }
    this.pushLog(gameState, success ? 'trophy' : 'leaf', message);
    await gameState.save();
    return { gameState, message, success, chance, cost };
  }

  // 슬롯에 장비를 장착한다. 이미 다른 슬롯에 끼워져 있으면 그쪽을 비우고 옮긴다. itemId가 ''이면 해제.
  async equipEquipment(userId: string, slotIndex: number, itemId: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    const slots = [...gameState.equipmentSlots];
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= slots.length) {
      throw new BadRequestException('사용할 수 없는 슬롯이에요.');
    }
    let message: string;
    if (itemId) {
      this.findEquipment(gameState, itemId);
      const from = slots.indexOf(itemId);
      if (from >= 0) slots[from] = '';
      slots[slotIndex] = itemId;
      message = `${EQUIPMENT_BY_ID.get(itemId)?.name ?? itemId}을(를) 장착했어요.`;
    } else {
      slots[slotIndex] = '';
      message = '장비를 해제했어요.';
    }
    gameState.equipmentSlots = slots;
    await gameState.save();
    return { gameState, message };
  }

  // 슬롯을 한 칸 늘린다(4번째 500다이아, 5번째 1250다이아).
  async expandEquipmentSlots(userId: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    const count = gameState.equipmentSlots.length;
    if (count >= EQUIPMENT_MAX_SLOTS) {
      throw new BadRequestException('슬롯을 이미 모두 확장했어요.');
    }
    const cost = EQUIPMENT_SLOT_EXPAND_COSTS[count - EQUIPMENT_BASE_SLOTS];
    if (gameState.diamonds < cost) {
      throw new BadRequestException(`슬롯 확장에는 💎 ${cost}개가 필요해요.`);
    }
    gameState.diamonds -= cost;
    gameState.equipmentSlots = [...gameState.equipmentSlots, ''];
    const message = `장비 슬롯이 ${count + 1}칸이 됐어요! -💎 ${cost}`;
    this.pushLog(gameState, 'diamond', message);
    await gameState.save();
    return { gameState, message, cost };
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

    // 탐색을 많이 할수록 골드 비용이 오른다(매일 초기화되지 않는다). 탐색권으로 하는 탐색은 골드가 들지 않는다.
    const exploreSteps = gameState.exploreCostSteps || 0;
    const cost = getExploreCost(exploreSteps);
    if (useTicket) {
      if (gameState.explorationTickets < 1) {
        throw new BadRequestException('숲 탐색권이 없어요.');
      }
      gameState.explorationTickets -= 1;
    } else {
      if (gameState.coins < cost) {
        throw new BadRequestException(
          `${exploreSteps + 1}번째 탐색에는 ${cost.toLocaleString('ko-KR')} G가 필요해요. 수익을 받거나 식구를 분양해 보세요.`,
        );
      }
      gameState.coins -= cost;
    }
    gameState.daily.explore = (gameState.daily.explore || 0) + 1; // 일일 퀘스트용(하루마다 초기화)
    gameState.exploreCostSteps = exploreSteps + 1; // 탐색 비용용(계속 누적)

    const speciesList = await this.speciesService.findAll();
    const rarity = rollRarity(Math.random(), RARITIES);
    // 오늘 날씨가 편드는 계열 종이 같은 등급 안에서 더 잘 나온다(날씨 정보가 없으면 균등).
    const favored = getWeatherEffects(this.weatherService?.current()?.type).favored;
    const species = favored
      ? pickWeightedByFamily(speciesList.filter((s) => s.rarity === rarity), Math.random(), favored, (s) => resolveFamily(s))
      : pickRandomOfRarity(speciesList, rarity, Math.random());
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
      `${species.name} 2마리를 만나 ${terrarium.name}에 데려왔어요.${isNew ? ` 도감에 새롭게 기록했어요! 💎 ${newSpeciesDiamonds}개 획득!` : ''}${useTicket ? ' (탐색권 사용)' : ` (-${cost.toLocaleString('ko-KR')} G)`}`,
    );

    await gameState.save();
    return {
      gameState,
      species,
      isNew,
      message: `${species.name} 2마리가 숲에 왔어요!`,
    };
  }

  // ---- 고급 탐색(원정) ----
  // 숲 탐색 비용에 비례하는 골드를 내고 에픽 이상을 확정으로 만난다(대원정이 전설·신화 확률이 더 높다). 탐색권으로는 갈 수 없다.
  // 오늘 이 원정을 다녀온 횟수(날짜가 바뀌었는데 아직 초기화되지 않았다면 0)
  private expeditionUsedToday(gameState: GameStateDocument, tierNo: number): number {
    if (gameState.daily?.day !== dayKey()) return 0;
    const field = EXPEDITION_DAILY_FIELD[tierNo];
    return field ? gameState.daily[field] ?? 0 : 0;
  }

  async getExpeditionInfo(userId: string) {
    const gameState = await this.getOrThrow(userId);
    const steps = gameState.exploreCostSteps || 0;
    return {
      pity: gameState.expeditionPity || 0,
      pityLimit: EXPEDITION_PITY_LIMIT,
      yield: EXPLORE_YIELD,
      tiers: EXPEDITION_TIERS.map((t) => ({
        tier: t.tier,
        name: t.name,
        price: getExpeditionPrice(t, steps),
        odds: t.odds,
        dailyLimit: t.dailyLimit,
        usedToday: this.expeditionUsedToday(gameState, t.tier),
      })),
    };
  }

  async expedition(userId: string, tierNo: number, terrariumId?: string) {
    const tier = getExpeditionTier(tierNo);
    if (!tier) throw new BadRequestException('존재하지 않는 원정이에요.');
    if (this.expeditionInFlight.has(userId)) {
      throw new BadRequestException('원정을 준비하는 중이에요. 잠시만 기다려 주세요.');
    }
    this.expeditionInFlight.add(userId);
    try {
      const gameState = await this.getOrThrow(userId);
      this.guardPaused(gameState);
      this.resetDailyIfNeeded(gameState);

      const usedToday = this.expeditionUsedToday(gameState, tier.tier);
      if (usedToday >= tier.dailyLimit) {
        throw new BadRequestException(`오늘 ${tier.name}은(는) ${tier.dailyLimit}번 모두 다녀왔어요. 내일 다시 떠날 수 있어요.`);
      }

      const terrarium = this.getTerrarium(gameState, terrariumId);
      if (getPopulationCount(terrarium.population) + EXPLORE_YIELD > getCapacity(terrarium.spaceLevel)) {
        throw new BadRequestException(
          `${terrarium.name}에 새 식구 2마리를 위한 자리가 부족해요. 사육장을 확장하거나 분양·이사해 주세요.`,
        );
      }
      const steps = gameState.exploreCostSteps || 0;
      const price = getExpeditionPrice(tier, steps);
      if (gameState.coins < price) {
        throw new BadRequestException(`${tier.name}에는 ${price.toLocaleString('ko-KR')} G가 필요해요.`);
      }

      const speciesList = await this.speciesService.findAll();
      const pity = gameState.expeditionPity || 0;
      const forced = pity + 1 >= EXPEDITION_PITY_LIMIT; // 신화를 못 만난 원정이 쌓이면 이번에는 신화 확정
      const rarity = forced ? 4 : rollExpeditionRarity(tier, Math.random());
      const species = pickExpeditionSpecies(
        speciesList,
        rarity,
        gameState.discovered,
        Math.random(),
        getWeatherEffects(this.weatherService?.current()?.type).favored,
      );
      if (!species) throw new BadRequestException('만날 수 있는 종이 없어요.');

      gameState.coins -= price;
      // 원정도 숲 탐색 한 번으로 센다(다음 탐색 비용이 오르고, 일일 목표와 탐색 업적에 반영된다).
      gameState.exploreCostSteps = steps + 1;
      gameState.daily.explore = (gameState.daily.explore || 0) + 1;
      gameState.stats.explored++;
      gameState.expeditionPity = rarity === 4 ? 0 : pity + 1;
      gameState.daily[EXPEDITION_DAILY_FIELD[tier.tier]] = usedToday + 1;

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
      this.grantXp(gameState, isNew ? 40 : 20);

      const message =
        `${tier.name}에서 ${RARITIES[species.rarity].name} ${species.name} 2마리를 데려왔어요!` +
        (isNew ? ` 도감에 새롭게 기록했어요! 💎 ${newSpeciesDiamonds}개 획득!` : '') +
        (forced ? ' (신화 천장 발동)' : '') +
        ` (-${price.toLocaleString('ko-KR')} G)`;
      this.pushLog(gameState, 'search', message);
      await gameState.save();
      return {
        gameState,
        message,
        species,
        isNew,
        rarity,
        tier: tier.tier,
        cost: price,
        forced,
        pity: gameState.expeditionPity,
        pityLimit: EXPEDITION_PITY_LIMIT,
        dailyLimit: tier.dailyLimit,
        usedToday: usedToday + 1,
      };
    } finally {
      this.expeditionInFlight.delete(userId);
    }
  }

  // 사육장에 있는 식구를 분양한다. 잠근 종은 분양할 수 없고, 이 분양으로 계정 전체의 그 종이 0마리가 되려면
  // confirmLast(마지막 개체까지 판다는 확인)가 있어야 한다. 사육장마다 2마리를 남겨야 한다는 제한은 없다.
  async sell(
    userId: string,
    speciesId: string,
    quantity: number,
    terrariumId?: string,
    confirmLast = false,
  ) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    const terrarium = this.getTerrarium(gameState, terrariumId);

    const species = await this.speciesService.findOne(speciesId);
    if (!species) throw new BadRequestException('분양 수량을 확인해 주세요.');
    if ((gameState.lockedSpecies ?? []).includes(speciesId)) {
      throw new BadRequestException(`${species.name}은(는) 잠겨 있어요. 잠금을 풀어야 분양할 수 있어요.`);
    }

    const current = terrarium.population.get(speciesId) || 0;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > current) {
      throw new BadRequestException('분양 수량을 확인해 주세요. 이 사육장에 있는 만큼만 분양할 수 있어요.');
    }
    if (this.totalOf(gameState, speciesId) - quantity <= 0 && !confirmLast) {
      throw new BadRequestException(
        `${species.name}의 마지막 개체까지 분양하게 돼요. 다시 만나려면 탐색이나 원정에서 우연히 만나야 해요. 확인 후 다시 분양해 주세요.`,
      );
    }

    const amount = species.price * quantity;
    if (current - quantity <= 0) {
      // 한 마리도 남지 않으면 이 사육장의 기록(식구 수·번식 진행)을 지운다.
      terrarium.population.delete(speciesId);
      terrarium.breeding.delete(speciesId);
    } else {
      terrarium.population.set(speciesId, current - quantity);
    }
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
    const friendsCount = await this.countFriends(userId);
    const likes = await this.countLikes(userId);
    const { progress, target } = getAchievementProgress(
      achievement,
      {
        discovered: gameState.discovered,
        terrariumCount: gameState.terrariums.length,
        friendsCount,
        nicknamesCount: gameState.speciesNicknames.size,
        equipment: summarizeEquipment(gameState.equipment, gameState.equipmentSlots.length),
        decor: summarizeDecor(gameState.decorOwned, gameState.terrariums),
        likesReceived: likes.received,
        likesGiven: likes.given,
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

  // 우편으로 받은 자원을 지급한다(우편 수령 처리는 MailService가 하고, 여기서는 지급과 일지만 한다).
  // 관리자가 보낸 선물이라 누적 수익(stats.earned)에는 넣지 않는다 — 업적의 "번 돈"은 직접 번 것만 센다.
  async grantMailRewards(
    userId: string,
    rewards: { coins: number; diamonds: number; explorationTickets: number },
    title: string,
  ) {
    const gameState = await this.getOrThrow(userId);
    gameState.coins += rewards.coins;
    gameState.diamonds += rewards.diamonds;
    gameState.explorationTickets += rewards.explorationTickets;
    const parts = [
      rewards.coins ? `+${rewards.coins.toLocaleString('ko-KR')} G` : '',
      rewards.diamonds ? `💎 ${rewards.diamonds.toLocaleString('ko-KR')}개` : '',
      rewards.explorationTickets ? `🎟️ 탐색권 ${rewards.explorationTickets.toLocaleString('ko-KR')}장` : '',
    ].filter(Boolean);
    const message = `📬 우편 "${title}"을(를) 받았어요. ${parts.join(' · ')}`;
    this.pushLog(gameState, 'diamond', message);
    await gameState.save();
    return { gameState, message };
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

  // 종(콩벌레)에 내 전용 별명을 붙인다. 무료이며, 빈 문자열을 보내면 기본 이름으로 되돌린다.
  // 발견(discovered)한 종이면 지금 보유 중이 아니어도 지정할 수 있다.
  // 종을 잠그거나 푼다. 잠근 종은 분양할 수 없다(이사·번식·전투는 그대로 된다). 도감에 있는 종만 잠글 수 있다.
  async setSpeciesLock(userId: string, speciesId: string, locked: boolean) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    if (!gameState.discovered.includes(speciesId)) {
      throw new BadRequestException('아직 만나지 못한 식구예요.');
    }
    const species = await this.speciesService.findOne(speciesId);
    if (!species) throw new BadRequestException('존재하지 않는 종이에요.');

    const current = gameState.lockedSpecies ?? [];
    const isLocked = current.includes(speciesId);
    if (isLocked === locked) {
      return { gameState, message: locked ? '이미 잠겨 있어요.' : '이미 잠금이 풀려 있어요.' };
    }
    gameState.lockedSpecies = locked ? [...current, speciesId] : current.filter((id) => id !== speciesId);
    const displayName = this.displayNameFor(gameState, speciesId, species.name);
    const message = locked ? `${displayName}을(를) 잠갔어요. 풀기 전에는 분양할 수 없어요.` : `${displayName}의 잠금을 풀었어요.`;
    this.pushLog(gameState, 'leaf', message);
    await gameState.save();
    return { gameState, message };
  }

  async setSpeciesNickname(userId: string, speciesId: string, nickname: string) {
    const gameState = await this.getOrThrow(userId);
    if (!gameState.discovered.includes(speciesId)) {
      throw new BadRequestException('아직 만나지 못한 식구예요.');
    }
    const species = await this.speciesService.findOne(speciesId);
    if (!species) throw new BadRequestException('존재하지 않는 종이에요.');

    const trimmed = nickname.trim();
    if (!trimmed) {
      gameState.speciesNicknames.delete(speciesId);
      const message = `${species.name}의 별명을 기본 이름으로 되돌렸어요.`;
      this.pushLog(gameState, 'leaf', message);
      await gameState.save();
      return { gameState, message };
    }
    if (trimmed.length > SPECIES_NICKNAME_MAX_LENGTH) {
      throw new BadRequestException(
        `별명은 ${SPECIES_NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요.`,
      );
    }

    gameState.speciesNicknames.set(speciesId, trimmed);
    const message = `${species.name}에게 "${trimmed}"라는 별명을 붙여줬어요!`;
    this.pushLog(gameState, 'leaf', message);
    await gameState.save();
    return { gameState, message };
  }

  // 종 별명이 있으면 별명을, 없으면 기본 이름을 돌려준다. 전투·훈련 결과에 내 종 이름을 표시할 때 쓴다.
  private displayNameFor(
    gameState: GameStateDocument,
    speciesId: string,
    fallback: string,
  ): string {
    return gameState.speciesNicknames.get(speciesId) || fallback;
  }

  // 다른 유저의 공개 프로필(상태 메시지 + 요약 전적)을 조회한다. 코인·다이아 등 민감한 정보는 빼고 돌려준다.
  async getPublicProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('존재하지 않는 유저예요.');

    const gameState = await this.findOrCreate(userId);
    const totalPopulation = gameState.terrariums.reduce(
      (sum, t) => sum + getPopulationCount(t.population),
      0,
    );

    return {
      userId,
      displayName: effectiveDisplayName(user),
      avatarUrl: user.avatarUrl,
      profileMessage: user.profileMessage,
      createdAt: user.createdAt,
      xp: gameState.xp,
      pvpRating: gameState.pvpRating,
      discoveredCount: gameState.discovered.length,
      totalPopulation,
      achievementsClaimedCount: gameState.achievementsClaimed.length,
      stats: {
        battlesWon: gameState.stats.battlesWon,
        battlesLost: gameState.stats.battlesLost,
        pvpWins: gameState.stats.pvpWins,
        pvpLosses: gameState.stats.pvpLosses,
      },
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
        bossAttempts: 0,
        survivalAttempts: 0,
        bossExtraAttempts: 0,
        survivalExtraAttempts: 0,
        expeditionCount: 0,
        grandExpeditionCount: 0,
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
