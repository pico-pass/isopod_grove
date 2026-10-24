import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { findDecor } from '../decor/decor.data';
import { WEATHER_KINDS, type WeatherType } from '../weather/weather.data';
import { WeatherService } from '../weather/weather.service';
import { SpeciesService } from '../species/species.service';
import { GameStateService } from './game-state.service';
import { GameStateDocument } from './schemas/game-state.schema';
import { MerchantDay, MerchantDayDocument } from './schemas/merchant.schema';
import { BOOST_INFO, BOOST_MAX_STACK_HOURS, getBoostPrice, type BoostKind } from './game-engine';
import { findSeasonalEvent } from './event-engine';
import { getPuzzleDayKey, getPuzzleResetAt } from './puzzle-engine';
import { MERCHANT_SHARD_PACK, merchantBasePrice, merchantLotsFor, merchantPrice, merchantPriceMultiplier, moonPhase, weatherName, type MerchantLotDef } from './merchant-engine';

const DAY_MS = 24 * 3_600_000;
const fmt = (n: number) => n.toLocaleString('ko-KR');

// 떠돌이 상인: 규칙과 가격 공식은 merchant-engine.ts. 여기서는 그날의 날씨를 고정하고, 재고 화면과 구매(하루 한정 개수)를 맡는다.
@Injectable()
export class MerchantService {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly gameState: GameStateService,
    private readonly speciesService: SpeciesService,
    @InjectModel(MerchantDay.name) private readonly days: Model<MerchantDayDocument>,
    @Optional() private readonly weatherService?: WeatherService,
  ) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('상인과 거래하는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  // 그날 처음 상인을 본 시점의 날씨를 고정해서 돌려준다(동시에 만들어도 먼저 저장된 값을 쓴다)
  private async dayWeather(day: string, now: number): Promise<WeatherType | null> {
    const found = await this.days.findOne({ dayKey: day }).lean<{ weather: string }>();
    let weather = found?.weather;
    if (found === null || found === undefined) {
      const current = this.weatherService?.current()?.type ?? '';
      try {
        const created = await this.days
          .findOneAndUpdate({ dayKey: day }, { $setOnInsert: { weather: current, expireAt: new Date(getPuzzleResetAt(day) + 10 * DAY_MS) } }, { upsert: true, returnDocument: 'after' })
          .lean<{ weather: string }>();
        weather = created?.weather ?? current;
      } catch {
        weather = (await this.days.findOne({ dayKey: day }).lean<{ weather: string }>())?.weather ?? current;
      }
    }
    void now;
    return weather && WEATHER_KINDS[weather as WeatherType] ? (weather as WeatherType) : null;
  }

  private itemInfo(def: MerchantLotDef) {
    if (def.kind === 'ticket') return { name: '숲 탐색권', icon: '🎟️', desc: '숲 탐색을 골드 없이 한 번 할 수 있어요.', tag: '탐색권' };
    if (def.kind === 'shard') return { name: `장비 조각 묶음 (${MERCHANT_SHARD_PACK}개)`, icon: '🔩', desc: '장비 레벨업·각인에 쓰는 장비 조각이에요.', tag: '조각' };
    if (def.kind === 'boost') {
      const info = BOOST_INFO.find((b) => b.kind === (def.itemId as BoostKind));
      return { name: `${info?.name ?? def.itemId} ${def.amount}시간`, icon: ({ income: '💰', breed: '🥚', battleXp: '⚔️' } as Record<string, string>)[def.itemId] ?? '⚡', desc: info?.description ?? '', tag: '부스트' };
    }
    const d = findDecor(def.itemId);
    const event = d?.eventId ? findSeasonalEvent(d.eventId) : undefined;
    return { name: d?.name ?? def.itemId, icon: d?.icon ?? '🎨', desc: d ? `${d.kind === 'backdrop' ? '배경' : '소품'} · ${d.description}` : '', tag: event ? `${event.name} 한정 장식` : '희귀 장식' };
  }

  private async view(gameState: GameStateDocument, now: number) {
    const day = getPuzzleDayKey(now);
    const weather = await this.dayWeather(day, now);
    const moon = moonPhase(day);
    const speciesList = await this.speciesService.findAll();
    const potential = this.gameState.hourlyIncomePotential(gameState, speciesList);
    const bought = gameState.merchant?.day === day ? gameState.merchant.bought : new Map<string, number>();
    const owned = new Set(gameState.decorOwned ?? []);
    const items = merchantLotsFor(day).map((def) => {
      const multiplier = merchantPriceMultiplier(def.kind, moon.fraction, weather);
      const decorPrice = def.kind === 'decor' ? findDecor(def.itemId)?.price ?? 0 : 0;
      const boostHourPrice = def.kind === 'boost' ? getBoostPrice(def.itemId as BoostKind, 1, potential) : 0;
      const base = merchantBasePrice(def, { boostHourPrice, decorPrice });
      const price = merchantPrice(base, multiplier, def.sale);
      const ratio = price / base;
      const got = bought.get(def.id) ?? 0;
      const alreadyOwned = def.kind === 'decor' && owned.has(def.itemId);
      return {
        id: def.id,
        kind: def.kind,
        ...this.itemInfo(def),
        amount: def.amount,
        limit: def.limit,
        bought: got,
        left: alreadyOwned ? 0 : Math.max(0, def.limit - got),
        alreadyOwned,
        base,
        multiplier: Math.round(multiplier * 100) / 100,
        price,
        sale: def.sale,
        verdict: def.sale ? 'sale' : ratio <= 0.9 ? 'cheap' : ratio >= 1.1 ? 'pricey' : 'normal',
      };
    });
    return { day, resetsInMs: getPuzzleResetAt(day) - now, coins: gameState.coins, moon: { name: moon.name, icon: moon.icon, fraction: Math.round(moon.fraction * 1000) / 1000 }, weather: weatherName(weather), items };
  }

  async get(userId: string) {
    return this.view(await this.gameState.getOrThrow(userId), Date.now());
  }

  // 상인에게서 산다. 한 사람이 하루에 품목마다 정해진 개수까지 살 수 있고, 장식은 이미 가졌으면 못 산다. 부스트는 24시간까지만 쌓인다.
  async buy(userId: string, itemId: string, count = 1) {
    return this.withLock(userId, async () => {
      const now = Date.now();
      const day = getPuzzleDayKey(now);
      const def = merchantLotsFor(day).find((l) => l.id === itemId);
      if (!def) throw new BadRequestException('상인에게 없는 물건이에요.');
      if (!Number.isInteger(count) || count < 1) throw new BadRequestException('개수를 확인해 주세요.');
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      if (gameState.merchant?.day !== day) gameState.merchant = { day, bought: new Map() };
      const got = gameState.merchant.bought.get(def.id) ?? 0;
      if (def.kind === 'decor' && (gameState.decorOwned ?? []).includes(def.itemId)) throw new BadRequestException('이미 가지고 있는 장식이에요.');
      if (got + count > def.limit) throw new BadRequestException(`오늘은 ${def.limit - got}개까지만 더 살 수 있어요. (한정 ${def.limit}개)`);
      const v = (await this.view(gameState, now)).items.find((i) => i.id === def.id)!;
      const total = v.price * count;
      if (gameState.coins < total) throw new BadRequestException(`골드가 부족해요. ${fmt(total)} G가 필요해요.`);
      if (def.kind === 'boost') {
        const current = (gameState.boosts ?? []).find((b) => b.kind === def.itemId && b.until > now);
        const remainingMs = current ? current.until - now : 0;
        if (remainingMs + def.amount * count * 3_600_000 > BOOST_MAX_STACK_HOURS * 3_600_000) throw new BadRequestException(`부스트는 최대 ${BOOST_MAX_STACK_HOURS}시간까지 쌓을 수 있어요.`);
        const hours = def.amount * count;
        const bought = current ? { kind: def.itemId, from: current.from, until: current.until + hours * 3_600_000 } : { kind: def.itemId, from: now, until: now + hours * 3_600_000 };
        gameState.boosts = [...(gameState.boosts ?? []).filter((b) => b.kind !== def.itemId && b.until > now).map((b) => ({ kind: b.kind, from: b.from, until: b.until })), bought];
      } else if (def.kind === 'ticket') {
        gameState.explorationTickets += def.amount * count;
      } else if (def.kind === 'shard') {
        gameState.equipmentShards = (gameState.equipmentShards ?? 0) + def.amount * count;
      } else {
        gameState.decorOwned = [...(gameState.decorOwned ?? []), def.itemId];
      }
      gameState.coins -= total;
      gameState.merchant.bought.set(def.id, got + count);
      const message = `${v.icon} ${v.name}${count > 1 ? ` ×${count}` : ''}을(를) 샀어요. (-${fmt(total)} G)`;
      this.gameState.pushLog(gameState, 'coins', `떠돌이 상인에게서 ${message}`);
      await gameState.save();
      return { gameState, message, status: await this.view(gameState, now) };
    });
  }
}
