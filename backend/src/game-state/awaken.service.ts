import { BadRequestException, Injectable } from '@nestjs/common';
import { SpeciesService } from '../species/species.service';
import { resolveFamily } from '../species/species.family';
import { GameStateService } from './game-state.service';
import { GameStateDocument } from './schemas/game-state.schema';
import { getBattleLevel, getBattleLevelProgress } from './game-engine';
import { AWAKEN_MAX_STARS, AWAKEN_REQUIRED_LEVEL, AWAKEN_STAR_BONUS, awakenCost, normalizeStars } from './awaken-engine';

// 전투 레벨 각성 ★: 규칙과 수치는 awaken-engine.ts, ★ 보너스를 전투에 넣는 곳은 GameStateService.battleBonuses.
// 여기서는 각성 가능한 식구 목록과 각성(레벨 1로 되돌리고 ★ +1)을 맡는다.
@Injectable()
export class AwakenService {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly gameState: GameStateService,
    private readonly speciesService: SpeciesService,
  ) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('각성을 처리하는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  private async view(gameState: GameStateDocument) {
    const list = await this.speciesService.findAll();
    const species = list
      .filter((s) => this.gameState.totalOf(gameState, s.speciesId) > 0 || this.gameState.starsOf(gameState, s.speciesId) > 0)
      .map((s) => {
        const xp = gameState.battleXp.get(s.speciesId) || 0;
        const progress = getBattleLevelProgress(xp);
        const stars = this.gameState.starsOf(gameState, s.speciesId);
        const owned = this.gameState.totalOf(gameState, s.speciesId) > 0;
        const next = stars >= AWAKEN_MAX_STARS ? null : awakenCost(s.rarity, stars + 1);
        const ready = owned && !!next && progress.level >= AWAKEN_REQUIRED_LEVEL;
        return {
          speciesId: s.speciesId,
          name: this.gameState.displayNameFor(gameState, s.speciesId, s.name),
          image: s.image,
          filter: s.filter,
          rarity: s.rarity,
          family: resolveFamily(s),
          owned,
          level: progress.level,
          xp: { current: progress.currentXp, required: progress.requiredXp },
          stars,
          bonus: stars * AWAKEN_STAR_BONUS,
          next,
          ready,
          afford: !!next && gameState.coins >= next.gold && gameState.diamonds >= next.diamonds,
        };
      })
      .sort((a, b) => Number(b.ready) - Number(a.ready) || b.stars - a.stars || b.level - a.level || b.rarity - a.rarity || a.speciesId.localeCompare(b.speciesId));
    return { coins: gameState.coins, diamonds: gameState.diamonds, requiredLevel: AWAKEN_REQUIRED_LEVEL, maxStars: AWAKEN_MAX_STARS, starBonus: AWAKEN_STAR_BONUS, species };
  }

  async get(userId: string) {
    return this.view(await this.gameState.getOrThrow(userId));
  }

  // 식구를 각성한다: 전투 레벨(경험치)이 1로 돌아가고 영구 ★가 1개 늘어난다(골드+다이아).
  async awaken(userId: string, speciesId: string) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const species = await this.speciesService.findOne(speciesId);
      if (!species) throw new BadRequestException('존재하지 않는 종이에요.');
      if (!(this.gameState.totalOf(gameState, speciesId) > 0)) throw new BadRequestException('지금 키우고 있는 식구만 각성할 수 있어요.');
      const stars = normalizeStars(gameState.battleStars?.get(speciesId));
      if (stars >= AWAKEN_MAX_STARS) throw new BadRequestException(`이미 ★${AWAKEN_MAX_STARS}까지 각성했어요.`);
      const level = getBattleLevel(gameState.battleXp.get(speciesId) || 0);
      if (level < AWAKEN_REQUIRED_LEVEL) throw new BadRequestException(`전투 레벨 ${AWAKEN_REQUIRED_LEVEL} 이상이어야 각성할 수 있어요. (지금 Lv.${level})`);
      const cost = awakenCost(species.rarity, stars + 1);
      if (gameState.coins < cost.gold) throw new BadRequestException(`골드가 부족해요. ${cost.gold.toLocaleString('ko-KR')} G가 필요해요.`);
      if (gameState.diamonds < cost.diamonds) throw new BadRequestException(`다이아가 부족해요. 💎 ${cost.diamonds}개가 필요해요.`);
      gameState.coins -= cost.gold;
      gameState.diamonds -= cost.diamonds;
      gameState.battleXp.set(speciesId, 0);
      if (!gameState.battleStars) gameState.battleStars = new Map();
      gameState.battleStars.set(speciesId, stars + 1);
      const name = this.gameState.displayNameFor(gameState, speciesId, species.name);
      const message = `⭐ ${name}이(가) ★${stars + 1}(으)로 각성했어요! 전투 레벨은 1로 돌아갔지만 능력치가 +${Math.round((stars + 1) * AWAKEN_STAR_BONUS * 100)}%예요. (-${cost.gold.toLocaleString('ko-KR')} G · 💎 ${cost.diamonds}개)`;
      this.gameState.pushLog(gameState, 'trophy', message);
      await gameState.save();
      return { gameState, message, status: await this.view(gameState) };
    });
  }
}
