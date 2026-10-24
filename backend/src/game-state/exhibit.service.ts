import { BadRequestException, Injectable } from '@nestjs/common';
import { SpeciesService } from '../species/species.service';
import { resolveFamily } from '../species/species.family';
import { GameStateService } from './game-state.service';
import { GameStateDocument } from './schemas/game-state.schema';
import { EXHIBIT_MAX_SHELF_LEVEL, EXHIBIT_MAX_TIER, EXHIBIT_TIERS, exhibitScore, shelfPrice, shelfSlots, specimenPrice, specimenScore } from './exhibit-engine';

// 표본 전시관: 규칙과 수치는 exhibit-engine.ts. 여기서는 표본 만들기·등급 올리기, 진열, 선반 늘리기와 화면용 현황을 맡는다.
@Injectable()
export class ExhibitService {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly gameState: GameStateService,
    private readonly speciesService: SpeciesService,
  ) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('전시관을 처리하는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  private ensure(gameState: GameStateDocument) {
    if (!gameState.exhibit) gameState.exhibit = { specimens: new Map(), shown: [], shelfLevel: 0, score: 0 };
    if (!gameState.exhibit.specimens) gameState.exhibit.specimens = new Map();
    return gameState.exhibit;
  }

  // 진열 중인 표본을 정리하고(없는 표본·중복 제거) 전시 점수를 다시 계산해 저장해 둔다
  private refresh(gameState: GameStateDocument, rarityOf: (id: string) => number | undefined) {
    const ex = this.ensure(gameState);
    const clean = [...new Set(ex.shown)].filter((id) => (ex.specimens.get(id) ?? 0) > 0 && rarityOf(id) !== undefined);
    ex.shown = clean.slice(0, shelfSlots(ex.shelfLevel));
    ex.score = exhibitScore(ex.shown, ex.specimens, rarityOf);
  }

  private async rarityMap() {
    const list = await this.speciesService.findAll();
    return { list, rarityOf: (() => { const m = new Map(list.map((s) => [s.speciesId, s.rarity])); return (id: string) => m.get(id); })() };
  }

  private async view(gameState: GameStateDocument) {
    const { list, rarityOf } = await this.rarityMap();
    const ex = this.ensure(gameState);
    const shown = new Set(ex.shown);
    const slots = shelfSlots(ex.shelfLevel);
    const species = list
      .filter((s) => this.gameState.totalOf(gameState, s.speciesId) > 0 || (ex.specimens.get(s.speciesId) ?? 0) > 0)
      .map((s) => {
        const tier = ex.specimens.get(s.speciesId) ?? 0;
        const owned = this.gameState.totalOf(gameState, s.speciesId) > 0;
        const next = tier >= EXHIBIT_MAX_TIER ? null : { tier: tier + 1, tierName: EXHIBIT_TIERS[tier].name, gold: specimenPrice(s.rarity, tier + 1) };
        return {
          speciesId: s.speciesId,
          name: this.gameState.displayNameFor(gameState, s.speciesId, s.name),
          image: s.image,
          filter: s.filter,
          rarity: s.rarity,
          family: resolveFamily(s),
          owned,
          tier,
          tierName: tier > 0 ? EXHIBIT_TIERS[tier - 1].name : '',
          score: specimenScore(s.rarity, tier),
          shown: shown.has(s.speciesId),
          next,
        };
      })
      .sort((a, b) => Number(b.shown) - Number(a.shown) || b.tier - a.tier || b.rarity - a.rarity || a.speciesId.localeCompare(b.speciesId));
    return {
      coins: gameState.coins,
      tiers: EXHIBIT_TIERS.map((t, i) => ({ tier: i + 1, id: t.id, name: t.name, icon: t.icon, points: t.points })),
      slots,
      used: ex.shown.length,
      shelfLevel: ex.shelfLevel,
      maxShelfLevel: EXHIBIT_MAX_SHELF_LEVEL,
      shelfNext: shelfPrice(ex.shelfLevel) === null ? null : { slots: shelfSlots(ex.shelfLevel + 1), gold: shelfPrice(ex.shelfLevel) as number },
      score: exhibitScore(ex.shown, ex.specimens, rarityOf),
      shownIds: [...ex.shown],
      species,
    };
  }

  async get(userId: string) {
    return this.view(await this.gameState.getOrThrow(userId));
  }

  // 표본을 만든다(처음이면 동표본) / 등급을 한 단계 올린다. 가진 종만 가능하고, 올릴 때는 다음 등급 값만 든다.
  async craft(userId: string, speciesId: string) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const { list, rarityOf } = await this.rarityMap();
      const species = list.find((s) => s.speciesId === speciesId);
      if (!species) throw new BadRequestException('존재하지 않는 종이에요.');
      if (!(this.gameState.totalOf(gameState, speciesId) > 0)) throw new BadRequestException('지금 키우고 있는 종만 표본으로 만들 수 있어요.');
      const ex = this.ensure(gameState);
      const tier = ex.specimens.get(speciesId) ?? 0;
      if (tier >= EXHIBIT_MAX_TIER) throw new BadRequestException('이미 최고 등급(화석 표본)이에요.');
      const price = specimenPrice(species.rarity, tier + 1);
      if (gameState.coins < price) throw new BadRequestException(`골드가 부족해요. ${price.toLocaleString('ko-KR')} G가 필요해요.`);
      gameState.coins -= price;
      ex.specimens.set(speciesId, tier + 1);
      const t = EXHIBIT_TIERS[tier];
      const name = this.gameState.displayNameFor(gameState, speciesId, species.name);
      const message = `${t.icon} ${name}의 ${t.name}을(를) ${tier === 0 ? '만들었어요' : '완성했어요'}! (-${price.toLocaleString('ko-KR')} G)`;
      this.gameState.pushLog(gameState, 'sprout', message);
      this.refresh(gameState, rarityOf);
      await gameState.save();
      return { gameState, message, status: await this.view(gameState) };
    });
  }

  // 표본을 진열하거나(show=true) 내린다. 진열 칸이 모자라면 못 한다.
  async display(userId: string, speciesId: string, show: boolean) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const { rarityOf } = await this.rarityMap();
      const ex = this.ensure(gameState);
      if (!((ex.specimens.get(speciesId) ?? 0) > 0)) throw new BadRequestException('아직 만들지 않은 표본이에요.');
      const shown = ex.shown.includes(speciesId);
      if (show && !shown) {
        if (ex.shown.length >= shelfSlots(ex.shelfLevel)) throw new BadRequestException('진열 칸이 가득 찼어요. 다른 표본을 내리거나 선반을 늘려 주세요.');
        ex.shown = [...ex.shown, speciesId];
      } else if (!show && shown) {
        ex.shown = ex.shown.filter((id) => id !== speciesId);
      }
      this.refresh(gameState, rarityOf);
      await gameState.save();
      return { gameState, message: show ? '표본을 전시관에 진열했어요.' : '표본을 전시관에서 내렸어요.', status: await this.view(gameState) };
    });
  }

  // 선반을 늘린다(진열 칸 +2)
  async expandShelf(userId: string) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const ex = this.ensure(gameState);
      const price = shelfPrice(ex.shelfLevel);
      if (price === null) throw new BadRequestException('선반을 더 늘릴 수 없어요.');
      if (gameState.coins < price) throw new BadRequestException(`골드가 부족해요. ${price.toLocaleString('ko-KR')} G가 필요해요.`);
      gameState.coins -= price;
      ex.shelfLevel += 1;
      const message = `🗄️ 선반을 늘렸어요! 진열 칸이 ${shelfSlots(ex.shelfLevel)}칸이 됐어요. (-${price.toLocaleString('ko-KR')} G)`;
      this.gameState.pushLog(gameState, 'sprout', message);
      await gameState.save();
      return { gameState, message, status: await this.view(gameState) };
    });
  }
}
