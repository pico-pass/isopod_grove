import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { FortuneService } from './fortune.service';

// 오늘의 운세
@Controller('game-state/fortune')
@UseGuards(JwtAuthGuard)
export class FortuneController {
  constructor(private readonly fortuneService: FortuneService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.fortuneService.get(user.userId);
  }

  @Post('draw')
  draw(@CurrentUser() user: AuthenticatedUser) {
    return this.fortuneService.draw(user.userId);
  }
}
