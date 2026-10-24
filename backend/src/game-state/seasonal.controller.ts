import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { SeasonalService } from './seasonal.service';
import { SeasonalGiftDto } from './dto/seasonal.dto';

// 절기·명절 한정 이벤트
@Controller('game-state/seasonal')
@UseGuards(JwtAuthGuard)
export class SeasonalController {
  constructor(private readonly seasonalService: SeasonalService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.seasonalService.get(user.userId);
  }

  @Post('gift')
  gift(@CurrentUser() user: AuthenticatedUser, @Body() dto: SeasonalGiftDto) {
    return this.seasonalService.claimGift(user.userId, dto.eventId);
  }
}
