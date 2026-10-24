import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WEATHER_KINDS, type WeatherType } from '../weather/weather.data';
import { WeatherService } from '../weather/weather.service';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { GameStateService } from './game-state.service';
import { getPuzzleDayKey, getPuzzleResetAt } from './puzzle-engine';
import { ShopSimDay, ShopSimDayDocument, ShopSimRecord, ShopSimRecordDocument } from './schemas/shop-sim.schema';
import {
  SHOP_BUDGET,
  SHOP_MAX_STOCK,
  SHOP_PRODUCTS,
  SHOP_REWARD_TIERS,
  SHOP_WEATHER_MULT,
  optimalShopPlan,
  randomShopEnv,
  rankShopRows,
  runShopDay,
  shopEfficiency,
  shopEnvForDay,
  shopPriceRange,
  shopReward,
  validateShopPlan,
  type ShopEnv,
  type ShopPlanItem,
} from './shop-sim-engine';

const BOARD_SIZE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

// 버섯 가게 운영: 규칙과 수치는 shop-sim-engine.ts, 여기서는 그날의 조건을 정하고 계획을 받아 결과·기록·보상을 서버가 정한다.
@Injectable()
export class ShopSimService {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly gameState: GameStateService,
    private readonly usersService: UsersService,
    @InjectModel(ShopSimRecord.name) private readonly records: Model<ShopSimRecordDocument>,
    @InjectModel(ShopSimDay.name) private readonly days: Model<ShopSimDayDocument>,
    // 날씨 정보. 없거나 오래돼서 모르면 맑음으로 본다(끝자리에 둬서 테스트 생성자 호출이 단순하다).
    @Optional() private readonly weatherService?: WeatherService,
  ) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('처리 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  // 그날의 날씨: 그날 처음 조회한 순간의 숲 날씨를 저장해 하루 동안 모두에게 같게 쓴다(날씨를 모르면 맑음).
  private async todayWeather(dayKey: string): Promise<WeatherType> {
    const current = this.weatherService?.current()?.type;
    const fallback: WeatherType = current && WEATHER_KINDS[current] ? current : 'clear';
    const expireAt = new Date(getPuzzleResetAt(dayKey) + 3 * DAY_MS);
    const doc = await this.days.findOneAndUpdate({ dayKey }, { $setOnInsert: { weather: fallback, expireAt } }, { upsert: true, returnDocument: 'after' }).lean<{ weather: string }>();
    return (doc && WEATHER_KINDS[doc.weather as WeatherType] ? doc.weather : fallback) as WeatherType;
  }

  private productViews(env: ShopEnv) {
    return SHOP_PRODUCTS.map((p) => {
      const range = shopPriceRange(p);
      const mult = SHOP_WEATHER_MULT[env.weather][p.id];
      return {
        id: p.id,
        name: p.name,
        icon: p.icon,
        cost: p.cost,
        basePrice: p.basePrice,
        minPrice: range.min,
        maxPrice: range.max,
        sensitivity: p.sensitivity,
        weatherMult: mult,
        // 기준가에서 날씨 영향만 반영한 예상 손님 수(그날의 변동 ±10%는 빠져 있다)
        expectedCustomers: Math.round(p.baseDemand * mult),
      };
    });
  }

  private resultView(result: ReturnType<typeof runShopDay>) {
    return {
      lines: result.lines,
      revenue: result.revenue,
      cost: result.cost,
      profit: result.profit,
    };
  }

  private async board(dayKey: string, requesterId: string) {
    const rows = await this.records.find({ dayKey }).sort({ efficiency: -1, profit: -1, playedAt: 1 }).lean<{ userId: Types.ObjectId; efficiency: number; profit: number }[]>();
    const ranks = rankShopRows(rows);
    const top = rows.slice(0, BOARD_SIZE);
    const users = top.length > 0 ? await this.usersService.findByIds(top.map((r) => r.userId.toString())) : [];
    const names = new Map(users.map((u) => [u._id.toString(), effectiveDisplayName(u)]));
    const mineIndex = rows.findIndex((r) => r.userId.toString() === requesterId);
    return {
      participants: rows.length,
      board: top.map((r, i) => ({ rank: ranks[i], userId: r.userId.toString(), displayName: names.get(r.userId.toString()) ?? '숲지기', isMe: r.userId.toString() === requesterId, efficiency: r.efficiency, profit: r.profit })),
      myRank: mineIndex >= 0 ? ranks[mineIndex] : null,
    };
  }

  async get(userId: string) {
    const dayKey = getPuzzleDayKey();
    const weather = await this.todayWeather(dayKey);
    const env = shopEnvForDay(dayKey, weather);
    const mine = await this.records.findOne({ dayKey, userId: new Types.ObjectId(userId) }).lean<{ efficiency: number; profit: number; plan: Record<string, unknown>[] }>();
    const { participants, board, myRank } = await this.board(dayKey, userId);
    const kind = WEATHER_KINDS[weather];
    return {
      dayKey,
      resetsAt: getPuzzleResetAt(dayKey),
      weather: { type: weather, name: kind.name, icon: kind.icon, flavor: kind.flavor },
      budget: SHOP_BUDGET,
      maxStock: SHOP_MAX_STOCK,
      products: this.productViews(env),
      today: mine ? { played: true, efficiency: mine.efficiency, profit: mine.profit, rank: myRank, plan: mine.plan } : { played: false },
      participants,
      board,
      rewards: SHOP_REWARD_TIERS,
    };
  }

  // 영업한다. 정식 영업은 하루 한 번(기록·보상·순위), 연습 영업은 무작위 하루로 마음껏(기록 없음).
  async run(userId: string, plan: ShopPlanItem[], practice = false) {
    const problem = validateShopPlan(plan);
    if (problem) throw new BadRequestException(problem);
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const now = Date.now();
      const dayKey = getPuzzleDayKey(now);
      if (practice) {
        const env = randomShopEnv();
        const result = runShopDay(env, plan);
        const optimum = optimalShopPlan(env);
        const kind = WEATHER_KINDS[env.weather];
        return {
          gameState,
          message: `연습 영업: 이익 ${result.profit.toLocaleString('ko-KR')}`,
          practice: true as const,
          weather: { type: env.weather, name: kind.name, icon: kind.icon },
          result: this.resultView(result),
          efficiency: shopEfficiency(result.profit, optimum.profit),
          optimum,
          reward: null,
          rank: null,
          participants: null,
        };
      }
      const uid = new Types.ObjectId(userId);
      if (await this.records.exists({ dayKey, userId: uid })) throw new BadRequestException('오늘의 정식 영업은 이미 했어요. 연습 영업은 얼마든지 할 수 있어요.');
      const weather = await this.todayWeather(dayKey);
      const env = shopEnvForDay(dayKey, weather);
      const result = runShopDay(env, plan);
      const optimum = optimalShopPlan(env);
      const efficiency = shopEfficiency(result.profit, optimum.profit);
      try {
        await this.records.create({ dayKey, userId: uid, profit: result.profit, efficiency, plan: plan.map((p) => ({ productId: p.productId, stock: p.stock, price: p.price })), playedAt: new Date(now), expireAt: new Date(getPuzzleResetAt(dayKey) + 30 * DAY_MS) });
      } catch (e) {
        if ((e as { code?: number }).code === 11000) throw new BadRequestException('오늘의 정식 영업은 이미 했어요. 연습 영업은 얼마든지 할 수 있어요.');
        throw e;
      }
      const reward = shopReward(efficiency);
      gameState.coins += reward.gold;
      gameState.stats.earned += reward.gold;
      gameState.explorationTickets += reward.explorationTickets;
      gameState.diamonds += reward.diamonds;
      const rewardText = [
        reward.gold ? `+${reward.gold.toLocaleString('ko-KR')} G` : '',
        reward.explorationTickets ? `🎟️ 탐색권 ${reward.explorationTickets}장` : '',
        reward.diamonds ? `💎 ${reward.diamonds}개` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      const message = `버섯 가게 영업! 이익 ${result.profit.toLocaleString('ko-KR')} (최적의 ${efficiency}%)${rewardText ? ` — ${rewardText}` : ''}`;
      this.gameState.pushLog(gameState, 'trophy', message);
      await gameState.save();
      const { participants, myRank } = await this.board(dayKey, userId);
      const kind = WEATHER_KINDS[weather];
      return {
        gameState,
        message,
        practice: false as const,
        weather: { type: weather, name: kind.name, icon: kind.icon },
        result: this.resultView(result),
        efficiency,
        optimum,
        reward,
        rank: myRank,
        participants,
      };
    });
  }
}
