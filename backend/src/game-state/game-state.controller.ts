import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GameStateService } from './game-state.service';
import { AdvanceDto } from './dto/advance.dto';
import { CareDto } from './dto/care.dto';
import { ObserveDto } from './dto/observe.dto';
import { SellDto } from './dto/sell.dto';
import { UpgradeDto } from './dto/upgrade.dto';
import { ClaimDto } from './dto/claim.dto';

@Controller('game-state')
@UseGuards(JwtAuthGuard)
export class GameStateController {
  constructor(private readonly gameStateService: GameStateService) {}

  @Get()
  findOrCreate(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.findOrCreate(user.userId);
  }

  @Post('advance')
  advance(@CurrentUser() user: AuthenticatedUser, @Body() dto: AdvanceDto) {
    return this.gameStateService.advance(user.userId, dto.seconds);
  }

  @Post('care')
  care(@CurrentUser() user: AuthenticatedUser, @Body() dto: CareDto) {
    return this.gameStateService.care(user.userId, dto.action);
  }

  @Post('observe')
  observe(@CurrentUser() user: AuthenticatedUser, @Body() dto: ObserveDto) {
    return this.gameStateService.observe(user.userId, dto.speciesId);
  }

  @Post('collect')
  collect(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.collect(user.userId);
  }

  @Post('explore')
  explore(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.explore(user.userId);
  }

  @Post('sell')
  sell(@CurrentUser() user: AuthenticatedUser, @Body() dto: SellDto) {
    return this.gameStateService.sell(user.userId, dto.speciesId, dto.quantity);
  }

  @Post('upgrade')
  upgrade(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpgradeDto) {
    return this.gameStateService.upgrade(user.userId, dto.upgradeId);
  }

  @Post('claim')
  claim(@CurrentUser() user: AuthenticatedUser, @Body() dto: ClaimDto) {
    return this.gameStateService.claim(user.userId, dto.questId);
  }
}
