import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { LeaderboardService, parseLeaderboardLimit } from './leaderboard.service';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('level')
  level(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.leaderboardService.getLevelLeaderboard(user.userId, parseLeaderboardLimit(limit));
  }

  @Get('income')
  income(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.leaderboardService.getIncomeLeaderboard(user.userId, parseLeaderboardLimit(limit));
  }

  @Get('boss')
  boss(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.leaderboardService.getBossLeaderboard(user.userId, parseLeaderboardLimit(limit));
  }

  @Get('survival')
  survival(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.leaderboardService.getSurvivalLeaderboard(user.userId, parseLeaderboardLimit(limit));
  }

  @Get('runner')
  runner(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.leaderboardService.getRunnerLeaderboard(user.userId, parseLeaderboardLimit(limit));
  }

  @Get('puzzle')
  puzzle(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.leaderboardService.getPuzzleLeaderboard(user.userId, parseLeaderboardLimit(limit));
  }

  @Get('likes')
  likes(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.leaderboardService.getLikesLeaderboard(user.userId, parseLeaderboardLimit(limit));
  }

  @Get('pvp')
  pvp(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.leaderboardService.getPvpLeaderboard(user.userId, parseLeaderboardLimit(limit));
  }
}
