import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('level')
  level(@CurrentUser() user: AuthenticatedUser) {
    return this.leaderboardService.getLevelLeaderboard(user.userId);
  }

  @Get('income')
  income(@CurrentUser() user: AuthenticatedUser) {
    return this.leaderboardService.getIncomeLeaderboard(user.userId);
  }
}
