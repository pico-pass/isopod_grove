import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DECOR_CATALOG, DECOR_PROP_SLOTS, DECOR_TIER_NAMES } from './decor.data';

@Controller('decor')
@UseGuards(JwtAuthGuard)
export class DecorController {
  @Get()
  catalog() {
    return { propSlots: DECOR_PROP_SLOTS, tierNames: DECOR_TIER_NAMES, items: DECOR_CATALOG };
  }
}
