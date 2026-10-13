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
import { SurvivalChooseDto, SurvivalStartDto } from './dto/survival.dto';
import { BuyBoostDto } from './dto/boost.dto';
import { ExpeditionDto } from './dto/expedition.dto';
import { RenameTerrariumDto } from './dto/rename-terrarium.dto';
import { SetSpeciesLockDto } from './dto/set-species-lock.dto';
import { BossDuelActDto } from './dto/boss-duel-act.dto';
import { BattleDuelStartDto } from './dto/battle-duel-start.dto';
import { EquipmentDismantleDto } from './dto/equipment-dismantle.dto';
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
    return this.gameStateService.bossBattle(user.userId, dto.speciesId, dto.floor, dto.difficulty);
  }

  @Get('battle/duel')
  battleDuel(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.getBattleDuel(user.userId);
  }

  @Post('battle/duel/start')
  battleDuelStart(@CurrentUser() user: AuthenticatedUser, @Body() dto: BattleDuelStartDto) {
    return this.gameStateService.battleDuelStart(user.userId, dto.speciesId, dto.difficulty);
  }

  @Post('battle/duel/act')
  battleDuelAct(@CurrentUser() user: AuthenticatedUser, @Body() dto: BossDuelActDto) {
    return this.gameStateService.battleDuelAct(user.userId, dto.action);
  }

  @Post('battle/duel/forfeit')
  battleDuelForfeit(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.battleDuelForfeit(user.userId);
  }

  @Get('boss/duel')
  bossDuel(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.getBossDuel(user.userId);
  }

  @Post('boss/duel/start')
  bossDuelStart(@CurrentUser() user: AuthenticatedUser, @Body() dto: BossBattleDto) {
    return this.gameStateService.bossDuelStart(user.userId, dto.speciesId, dto.floor, dto.difficulty);
  }

  @Post('boss/duel/act')
  bossDuelAct(@CurrentUser() user: AuthenticatedUser, @Body() dto: BossDuelActDto) {
    return this.gameStateService.bossDuelAct(user.userId, dto.action);
  }

  @Post('boss/duel/forfeit')
  bossDuelForfeit(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.bossDuelForfeit(user.userId);
  }

  @Get('boosts')
  boostShop(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.getBoostShop(user.userId);
  }

  @Post('boosts/buy')
  buyBoost(@CurrentUser() user: AuthenticatedUser, @Body() dto: BuyBoostDto) {
    return this.gameStateService.buyBoost(user.userId, dto.kind, dto.hours);
  }

  @Post('boss/buy-attempt')
  buyBossAttempt(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.buyBossAttempt(user.userId);
  }

  @Post('boss/skip-cooldown')
  skipBossCooldown(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.skipBossCooldown(user.userId);
  }

  @Get('survival')
  survivalStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.getSurvivalStatus(user.userId);
  }

  @Post('survival/start')
  survivalStart(@CurrentUser() user: AuthenticatedUser, @Body() dto: SurvivalStartDto) {
    return this.gameStateService.survivalStart(user.userId, dto.speciesId, dto.mode);
  }

  @Post('survival/duel/act')
  survivalDuelAct(@CurrentUser() user: AuthenticatedUser, @Body() dto: BossDuelActDto) {
    return this.gameStateService.survivalDuelAct(user.userId, dto.action);
  }

  @Post('survival/choose')
  survivalChoose(@CurrentUser() user: AuthenticatedUser, @Body() dto: SurvivalChooseDto) {
    return this.gameStateService.survivalChoose(user.userId, dto.buffId);
  }

  @Post('survival/retire')
  survivalRetire(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.survivalRetire(user.userId);
  }

  @Post('survival/buy-attempt')
  buySurvivalAttempt(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.buySurvivalAttempt(user.userId);
  }

  @Post('survival/revive')
  survivalRevive(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.survivalRevive(user.userId);
  }

  @Get('expedition')
  expeditionInfo(@CurrentUser() user: AuthenticatedUser) {
    return this.gameStateService.getExpeditionInfo(user.userId);
  }

  @Post('expedition')
  expedition(@CurrentUser() user: AuthenticatedUser, @Body() dto: ExpeditionDto) {
    return this.gameStateService.expedition(user.userId, dto.tier, dto.terrariumId);
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
      dto.confirmLast === true,
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

  @Post('terrariums/rename')
  renameTerrarium(@CurrentUser() user: AuthenticatedUser, @Body() dto: RenameTerrariumDto) {
    return this.gameStateService.renameTerrarium(user.userId, dto.terrariumId, dto.name);
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

  @Post('equipment/dismantle')
  dismantleEquipment(@CurrentUser() user: AuthenticatedUser, @Body() dto: EquipmentDismantleDto) {
    return this.gameStateService.dismantleEquipment(user.userId, dto.itemId, dto.count);
  }

  @Post('equipment/level-up-shards')
  levelUpEquipmentWithShards(@CurrentUser() user: AuthenticatedUser, @Body() dto: EquipmentItemDto) {
    return this.gameStateService.levelUpEquipmentWithShards(user.userId, dto.itemId);
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

  @Post('species-lock')
  setSpeciesLock(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetSpeciesLockDto) {
    return this.gameStateService.setSpeciesLock(user.userId, dto.speciesId, dto.locked);
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
