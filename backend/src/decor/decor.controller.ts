import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DECOR_CATALOG, DECOR_PROP_SLOTS, DECOR_TIER_NAMES } from './decor.data';
import { findSeasonalEvent, isSeasonalEventActive } from '../game-state/event-engine';

@Controller('decor')
@UseGuards(JwtAuthGuard)
export class DecorController {
  @Get()
  catalog() {
    // 한정 장식에는 이벤트 이름과 지금 살 수 있는지(available)를 붙인다(서버가 구매 때 다시 확인한다)
    const items = DECOR_CATALOG.map((d) => (d.eventId ? { ...d, eventName: findSeasonalEvent(d.eventId)?.name ?? '', available: isSeasonalEventActive(d.eventId) } : d));
    return { propSlots: DECOR_PROP_SLOTS, tierNames: DECOR_TIER_NAMES, items };
  }
}
