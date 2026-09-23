import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GameState, GameStateDocument } from './schemas/game-state.schema';
import { SpeciesService } from '../species/species.service';
import { UpgradesService } from '../upgrades/upgrades.service';
import { QuestsService } from '../quests/quests.service';
import { RARITIES } from '../species/species.seed-data';
import { CareAction } from './dto/care.dto';
import {
  CARE_COOLDOWN_MS,
  EXPLORE_COST,
  EXPLORE_YIELD,
  FEEDER_REFILL_TARGET,
  FEEDER_REFILL_THRESHOLD,
  MAX_ADVANCE_SECONDS,
  MISTER_REFILL_TARGET,
  MISTER_REFILL_THRESHOLD,
  OBSERVE_COOLDOWN_MS,
  OBSERVE_REWARD,
  STEP_SECONDS,
  canBreedInEnvironment,
  clamp,
  getAutoIncomeRate,
  getBreedInterval,
  getCapacity,
  getPopulationCount,
  isComfortable,
  pickRandomOfRarity,
  rollRarity,
} from './game-engine';

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
  ) {}

  findByUserId(userId: string): Promise<GameState | null> {
    return this.gameStateModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async createInitialState(userId: string): Promise<GameStateDocument> {
    return this.gameStateModel.create({
      userId: new Types.ObjectId(userId),
      population: { vulgare: 6 },
      discovered: ['vulgare'],
      daily: { day: dayKey(), feed: 0, observe: 0, births: 0, claimed: [] },
      logs: [
        {
          at: Date.now(),
          type: 'leaf',
          text: '공벌레 6마리와 함께 작은 숲을 시작했어요.',
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
    const spaceLevel = gameState.upgrades.get('space') || 0;
    const soilLevel = gameState.upgrades.get('soil') || 0;
    const nurseryLevel = gameState.upgrades.get('nursery') || 0;
    const hasFeeder = (gameState.upgrades.get('feeder') || 0) > 0;
    const hasMister = (gameState.upgrades.get('mister') || 0) > 0;
    const capacity = getCapacity(spaceLevel);

    let remaining = clamp(seconds, 0, MAX_ADVANCE_SECONDS);
    let earned = 0;
    const babies = new Map<string, number>();

    while (remaining > 0) {
      const step = Math.min(remaining, STEP_SECONDS);
      remaining -= step;

      gameState.stats.played += step;
      const count = getPopulationCount(gameState.population);
      gameState.food = clamp(
        gameState.food - (0.015 + count * 0.0015) * step,
        0,
        100,
      );
      gameState.humidity = clamp(gameState.humidity - 0.023 * step, 0, 100);
      const ambient = 24 + Math.sin(gameState.stats.played / 700) * 2.7;
      gameState.temperature +=
        (ambient - gameState.temperature) * Math.min(1, step * 0.002);

      if (hasFeeder && gameState.food < FEEDER_REFILL_THRESHOLD) {
        gameState.food = FEEDER_REFILL_TARGET;
      }
      if (hasMister && gameState.humidity < MISTER_REFILL_THRESHOLD) {
        gameState.humidity = MISTER_REFILL_TARGET;
      }

      const comfortable = isComfortable(
        gameState.food,
        gameState.humidity,
        gameState.temperature,
      );
      const rate = getAutoIncomeRate(
        gameState.population,
        speciesList,
        soilLevel,
        comfortable,
      );
      const income = rate * step;
      gameState.pending += income;
      earned += income;

      if (
        canBreedInEnvironment(
          gameState.food,
          gameState.humidity,
          gameState.temperature,
        )
      ) {
        let capacityLeft = capacity - getPopulationCount(gameState.population);
        for (const species of speciesList) {
          const current = gameState.population.get(species.speciesId) || 0;
          if (current < 2) continue;
          const limit = getBreedInterval(species.breed, nurseryLevel);
          const progressed = Math.min(
            limit,
            (gameState.breeding.get(species.speciesId) || 0) + step,
          );
          gameState.breeding.set(species.speciesId, progressed);
          if (progressed >= limit && capacityLeft > 0) {
            gameState.breeding.set(species.speciesId, 0);
            gameState.population.set(species.speciesId, current + 1);
            capacityLeft--;
            babies.set(
              species.speciesId,
              (babies.get(species.speciesId) || 0) + 1,
            );
            gameState.xp += 8;
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

  async care(userId: string, action: CareAction) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    this.resetDailyIfNeeded(gameState);
    const now = Date.now();
    if ((gameState.cooldowns.get(action) || 0) > now) {
      throw new BadRequestException('조금만 기다려 주세요.');
    }

    let message: string;
    if (action === 'feed') {
      gameState.food = clamp(gameState.food + 30, 0, 100);
      gameState.daily.feed++;
      gameState.xp += 4;
      message = '신선한 낙엽을 채웠어요. 맛있게 먹어!';
    } else if (action === 'mist') {
      gameState.humidity = 78;
      message = '숲이 촉촉해졌어요. 습도 78%';
    } else {
      gameState.temperature = 24;
      message = '포근한 24°C로 맞췄어요.';
    }
    gameState.cooldowns.set(action, now + CARE_COOLDOWN_MS);

    await gameState.save();
    return { gameState, message };
  }

  async observe(userId: string, speciesId: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);
    if (!((gameState.population.get(speciesId) || 0) > 0)) {
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
    gameState.xp++;
    gameState.daily.observe++;

    const species = await this.speciesService.findOne(speciesId);
    await gameState.save();
    return {
      gameState,
      message: `${species?.name ?? speciesId} 관찰 완료! +${OBSERVE_REWARD} G`,
      coins: OBSERVE_REWARD,
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

  async explore(userId: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);

    const spaceLevel = gameState.upgrades.get('space') || 0;
    const capacity = getCapacity(spaceLevel);
    const count = getPopulationCount(gameState.population);
    if (count + EXPLORE_YIELD > capacity) {
      throw new BadRequestException(
        '새 식구 2마리를 위한 자리가 부족해요. 사육장을 확장하거나 분양해 주세요.',
      );
    }
    if (gameState.coins < EXPLORE_COST) {
      throw new BadRequestException(
        `탐색에는 ${EXPLORE_COST} G가 필요해요. 수익을 받거나 식구를 분양해 보세요.`,
      );
    }

    gameState.coins -= EXPLORE_COST;
    const speciesList = await this.speciesService.findAll();
    const rarity = rollRarity(Math.random(), RARITIES);
    const species = pickRandomOfRarity(speciesList, rarity, Math.random());
    const isNew = !gameState.discovered.includes(species.speciesId);
    gameState.population.set(
      species.speciesId,
      (gameState.population.get(species.speciesId) || 0) + EXPLORE_YIELD,
    );
    if (isNew) gameState.discovered.push(species.speciesId);
    gameState.xp += isNew ? 25 : 10;
    gameState.stats.explored++;
    this.pushLog(
      gameState,
      'search',
      `${species.name} 2마리를 만났어요.${isNew ? ' 도감에 새롭게 기록했어요!' : ''}`,
    );

    await gameState.save();
    return {
      gameState,
      species,
      isNew,
      message: `${species.name} 2마리가 숲에 왔어요!`,
    };
  }

  async sell(userId: string, speciesId: string, quantity: number) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);

    const species = await this.speciesService.findOne(speciesId);
    if (!species) throw new BadRequestException('분양 수량을 확인해 주세요.');

    const current = gameState.population.get(speciesId) || 0;
    if (current - quantity < 2) {
      throw new BadRequestException('번식을 위해 2마리는 남겨둬야 해요.');
    }

    const amount = species.price * quantity;
    gameState.population.set(speciesId, current - quantity);
    gameState.coins += amount;
    gameState.stats.sold += quantity;
    gameState.stats.earned += amount;
    gameState.xp += quantity * 3;
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

  async upgrade(userId: string, upgradeId: string) {
    const gameState = await this.getOrThrow(userId);
    this.guardPaused(gameState);

    const upgrade = await this.upgradesService.findOne(upgradeId);
    if (!upgrade)
      throw new BadRequestException('존재하지 않는 업그레이드예요.');

    const currentLevel = gameState.upgrades.get(upgradeId) || 0;
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
    gameState.upgrades.set(upgradeId, currentLevel + 1);
    gameState.xp += 20;
    this.pushLog(
      gameState,
      'sprout',
      `${upgrade.name} Lv. ${currentLevel + 1} 업그레이드!`,
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
    gameState.xp += 15;
    this.pushLog(
      gameState,
      'flag',
      `오늘의 목표 달성: ${quest.label}. +${quest.reward} G`,
    );

    await gameState.save();
    return { gameState, message: `목표 보상 +${quest.reward} G를 받았어요!` };
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
        claimed: [],
      };
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

  private getOrNull(userId: string): Promise<GameStateDocument | null> {
    return this.gameStateModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
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
