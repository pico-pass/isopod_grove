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
import { ExploreDto } from './dto/explore.dto';
import { CreateTerrariumDto } from './dto/create-terrarium.dto';
import { MoveSpeciesDto } from './dto/move-species.dto';

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
    return this.gameStateService.care(user.userId, dto.action, dto.terrariumId);
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
  explore(@CurrentUser() user: AuthenticatedUser, @Body() dto: ExploreDto) {
    return this.gameStateService.explore(user.userId, dto?.terrariumId);
  }

  @Post('sell')
  sell(@CurrentUser() user: AuthenticatedUser, @Body() dto: SellDto) {
    return this.gameStateService.sell(
      user.userId,
      dto.speciesId,
      dto.quantity,
      dto.terrariumId,
    );
  }

  @Post('upgrade')
  upgrade(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpgradeDto) {
    return this.gameStateService.upgrade(
      user.userId,
      dto.upgradeId,
      dto.terrariumId,
    );
  }

  @Post('terrariums')
  addTerrarium(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTerrariumDto,
  ) {
    return this.gameStateService.addTerrarium(user.userId, dto?.name);
  }

  @Post('move')
  moveSpecies(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MoveSpeciesDto,
  ) {
    return this.gameStateService.moveSpecies(
      user.userId,
      dto.speciesId,
      dto.fromTerrariumId,
      dto.toTerrariumId,
    );
  }

  @Post('claim')
  claim(@CurrentUser() user: AuthenticatedUser, @Body() dto: ClaimDto) {
    return this.gameStateService.claim(user.userId, dto.questId);
  }
}
