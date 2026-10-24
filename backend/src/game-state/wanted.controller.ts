import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { WantedService } from './wanted.service';
import { WantedStartDto } from './dto/wanted.dto';
import { BossDuelActDto } from './dto/boss-duel-act.dto';

// 현상수배 보스
@Controller('game-state/wanted')
@UseGuards(JwtAuthGuard)
export class WantedController {
  constructor(private readonly wantedService: WantedService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.wantedService.get(user.userId);
  }

  @Post('start')
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: WantedStartDto) {
    return this.wantedService.start(user.userId, dto.speciesId, dto.tier);
  }

  @Post('act')
  act(@CurrentUser() user: AuthenticatedUser, @Body() dto: BossDuelActDto) {
    return this.wantedService.act(user.userId, dto.action, dto.rhythm);
  }

  @Post('forfeit')
  forfeit(@CurrentUser() user: AuthenticatedUser) {
    return this.wantedService.forfeit(user.userId);
  }
}
