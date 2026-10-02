import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { ClaimAchievementDto } from './dto/claim-achievement.dto';
import { ExploreDto } from './dto/explore.dto';
import { CreateTerrariumDto } from './dto/create-terrarium.dto';
import { MoveSpeciesDto } from './dto/move-species.dto';
import { SetNicknameDto } from './dto/set-nickname.dto';
import { BattleDto } from './dto/battle.dto';
import { TrainDto } from './dto/train.dto';
import { PvpSetDefenseDto } from './dto/pvp-set-defense.dto';
import { PvpBattleDto } from './dto/pvp-battle.dto';
import { BossBattleDto } from './dto/boss-battle.dto';
import { SetSpeciesNicknameDto } from './dto/set-species-nickname.dto';
import { EquipmentPullDto } from './dto/equipment-pull.dto';
import { EquipmentItemDto } from './dto/equipment-item.dto';
import { EquipmentEquipDto } from './dto/equipment-equip.dto';

@Controller('game-state')
@UseGuards(JwtAuthGuard)
export class GameStateController {
  constructor(private readonly gameStateService: GameStateService) {}

  @Get()
  findOrCreate(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.findOrCreate(user.userId);
  }

  @Get('profile/:userId')
  getPublicProfile(@Param('userId') userId: string) {
    return this.gameStateService.getPublicProfile(userId);
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

  @Post('battle')
  battle(@CurrentUser() user: AuthenticatedUser, @Body() dto: BattleDto) {
    return this.gameStateService.battle(user.userId, dto.speciesId, dto.difficulty);
  }

  @Post('train')
  train(@CurrentUser() user: AuthenticatedUser, @Body() dto: TrainDto) {
    return this.gameStateService.train(
      user.userId,
      dto.speciesId,
      dto.intensity,
      dto.extreme,
    );
  }

  @Post('pvp/defense')
  setPvpDefense(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PvpSetDefenseDto,
  ) {
    return this.gameStateService.setPvpDefense(user.userId, dto.speciesId);
  }

  @Get('pvp/opponent')
  findPvpOpponent(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.findPvpOpponent(user.userId);
  }

  @Post('pvp/battle')
  pvpBattle(@CurrentUser() user: AuthenticatedUser, @Body() dto: PvpBattleDto) {
    return this.gameStateService.pvpBattle(
      user.userId,
      dto.speciesId,
      dto.opponentUserId,
    );
  }

  @Post('boss/battle')
  bossBattle(@CurrentUser() user: AuthenticatedUser, @Body() dto: BossBattleDto) {
    return this.gameStateService.bossBattle(user.userId, dto.speciesId, dto.floor);
  }

  @Post('explore')
  explore(@CurrentUser() user: AuthenticatedUser, @Body() dto: ExploreDto) {
    return this.gameStateService.explore(
      user.userId,
      dto?.terrariumId,
      dto?.useTicket,
    );
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

  @Post('claim-achievement')
  claimAchievement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ClaimAchievementDto,
  ) {
    return this.gameStateService.claimAchievement(
      user.userId,
      dto.achievementId,
    );
  }

  @Post('equipment/pull')
  pullEquipment(@CurrentUser() user: AuthenticatedUser, @Body() dto: EquipmentPullDto) {
    return this.gameStateService.pullEquipment(user.userId, dto.count);
  }

  @Post('equipment/level-up')
  levelUpEquipment(@CurrentUser() user: AuthenticatedUser, @Body() dto: EquipmentItemDto) {
    return this.gameStateService.levelUpEquipment(user.userId, dto.itemId);
  }

  @Post('equipment/awaken')
  awakenEquipment(@CurrentUser() user: AuthenticatedUser, @Body() dto: EquipmentItemDto) {
    return this.gameStateService.awakenEquipment(user.userId, dto.itemId);
  }

  @Post('equipment/equip')
  equipEquipment(@CurrentUser() user: AuthenticatedUser, @Body() dto: EquipmentEquipDto) {
    return this.gameStateService.equipEquipment(user.userId, dto.slotIndex, dto.itemId);
  }

  @Post('equipment/expand-slot')
  expandEquipmentSlots(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.expandEquipmentSlots(user.userId);
  }

  @Post('set-nickname')
  setNickname(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetNicknameDto,
  ) {
    return this.gameStateService.setNickname(user.userId, dto.nickname);
  }

  @Post('species-nickname')
  setSpeciesNickname(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetSpeciesNicknameDto,
  ) {
    return this.gameStateService.setSpeciesNickname(
      user.userId,
      dto.speciesId,
      dto.nickname,
    );
  }
}
