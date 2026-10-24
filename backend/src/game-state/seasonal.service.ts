import { BadRequestException, Injectable } from '@nestjs/common';
import { DECOR_CATALOG } from '../decor/decor.data';
import { GameStateService } from './game-state.service';
import {
  SEASONAL_EVENTS,
  SEASONAL_EXPLORE_WEIGHT,
  SEASONAL_GIFT,
  activeSeasonalEvents,
  addDays,
  daysBetween,
  findSeasonalEvent,
  seasonalEventRange,
  seasonalGiftId,
  seasonalToday,
  upcomingSeasonalEvents,
} from './event-engine';
import { rewardText } from './restoration-engine';

// 계절 이벤트: 달력 규칙과 수치는 event-engine.ts, 한정 장식은 decor.data.ts(eventId). 여기서는 화면용 정보와 선물 받기를 맡는다.
@Injectable()
export class SeasonalService {
  private readonly inFlight = new Set<string>();

  constructor(private readonly gameState: GameStateService) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('선물을 처리하는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  async get(userId: string) {
    const now = Date.now();
    const today = seasonalToday(now);
    const gameState = await this.gameState.getOrThrow(userId);
    const claimed = new Set(gameState.seasonalGifts ?? []);
    const owned = new Set(gameState.decorOwned ?? []);
    const active = activeSeasonalEvents(now).map((e) => {
      const giftId = seasonalGiftId(e.id, now);
      return {
        ...e,
        daysLeft: daysBetween(today, e.to) + 1,
        exploreWeight: SEASONAL_EXPLORE_WEIGHT,
        giftId,
        giftClaimed: claimed.has(giftId),
        gift: SEASONAL_GIFT,
        giftText: rewardText(SEASONAL_GIFT),
        decor: DECOR_CATALOG.filter((d) => d.eventId === e.id).map((d) => ({ decorId: d.decorId, name: d.name, icon: d.icon, kind: d.kind, tier: d.tier, price: d.price, description: d.description, owned: owned.has(d.decorId) })),
      };
    });
    // 올해 일정 전체(지난 것·진행 중·앞으로 올 것)
    const year = Number(today.slice(0, 4));
    const calendar = SEASONAL_EVENTS.flatMap((def) => {
      const range = seasonalEventRange(def, year);
      if (!range) return [];
      return [{ id: def.id, name: def.name, icon: def.icon, family: def.family, from: range.from, to: range.to, state: today > range.to ? ('past' as const) : today >= range.from ? ('active' as const) : ('upcoming' as const) }];
    }).sort((a, b) => a.from.localeCompare(b.from));
    return {
      today,
      active,
      upcoming: upcomingSeasonalEvents(now, 3),
      calendar,
      ownedLimited: DECOR_CATALOG.filter((d) => d.eventId && owned.has(d.decorId)).length,
      totalLimited: DECOR_CATALOG.filter((d) => d.eventId).length,
    };
  }

  // 열려 있는 이벤트의 선물을 받는다(이벤트마다 한 해에 한 번)
  async claimGift(userId: string, eventId: string) {
    return this.withLock(userId, async () => {
      const event = findSeasonalEvent(eventId);
      if (!event) throw new BadRequestException('존재하지 않는 이벤트예요.');
      const now = Date.now();
      if (!activeSeasonalEvents(now).some((e) => e.id === eventId)) throw new BadRequestException(`${event.name} 이벤트 기간이 아니에요.`);
      const giftId = seasonalGiftId(eventId, now);
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      if ((gameState.seasonalGifts ?? []).includes(giftId)) throw new BadRequestException('올해 선물은 이미 받았어요.');
      gameState.seasonalGifts = [...(gameState.seasonalGifts ?? []), giftId];
      const g = SEASONAL_GIFT;
      gameState.coins += g.gold;
      gameState.stats.earned += g.gold;
      gameState.diamonds += g.diamonds;
      gameState.explorationTickets += g.tickets;
      const text = rewardText(g);
      this.gameState.pushLog(gameState, 'trophy', `${event.icon} ${event.name} 선물: ${text}`);
      await gameState.save();
      return { gameState, message: `${event.icon} ${event.name} 선물을 받았어요! ${text}`, status: await this.get(userId) };
    });
  }
}
