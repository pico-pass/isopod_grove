import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UnderdogService } from './underdog.service';
import { UnderdogEnterDto, UnderdogMatchDto } from './dto/underdog.dto';

// 하극상 대회(희귀도 '일반' 전용 주간 대회)
@Controller('game-state/underdog')
@UseGuards(JwtAuthGuard)
export class UnderdogController {
  constructor(private readonly underdogService: UnderdogService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.underdogService.get(user.userId);
  }

  @Post('enter')
  enter(@CurrentUser() user: AuthenticatedUser, @Body() dto: UnderdogEnterDto) {
    return this.underdogService.enter(user.userId, dto.speciesId);
  }

  @Get('opponent')
  findOpponent(@CurrentUser() user: AuthenticatedUser) {
    return this.underdogService.findOpponent(user.userId);
  }

  @Post('match')
  match(@CurrentUser() user: AuthenticatedUser, @Body() dto: UnderdogMatchDto) {
    return this.underdogService.match(user.userId, dto.opponentUserId ?? '');
  }

  @Post('claim')
  claim(@CurrentUser() user: AuthenticatedUser) {
    return this.underdogService.claim(user.userId);
  }
}
