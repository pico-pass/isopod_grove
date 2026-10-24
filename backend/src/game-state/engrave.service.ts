import { BadRequestException, Injectable } from '@nestjs/common';
import { EQUIPMENT_BY_ID } from '../equipment/equipment.data';
import { GameStateService } from './game-state.service';
import { GameStateDocument } from './schemas/game-state.schema';
import { ENGRAVE_KINDS, ENGRAVE_GRADES, engraveRollCost, engraveText, engraveValue, findEngraveKind, rollEngraving, type EngraveRoll } from './engrave-engine';

// 장비 각인 재련소: 규칙과 수치는 engrave-engine.ts. 여기서는 각인 굴리기·교체·버리기와 화면용 현황을 맡는다(효과는 GameStateService가 전투에 넣는다).
@Injectable()
export class EngraveService {
  private readonly inFlight = new Set<string>();

  constructor(private readonly gameState: GameStateService) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('각인을 처리하는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  private engraveView(kind: string, grade: number) {
    const k = findEngraveKind(kind);
    if (!k) return null;
    return { kind: k.id, name: k.name, icon: k.icon, grade, gradeName: ENGRAVE_GRADES[Math.max(0, Math.min(3, grade))].name, value: engraveValue(k.id, grade), unit: k.unit, text: engraveText(k.id, grade) };
  }

  // 가진 장비마다 지금 각인·새로 굴린(아직 고르지 않은) 각인·굴리는 값, 그리고 장착 중인 장비의 효과 합계
  private view(gameState: GameStateDocument) {
    const slots = new Set((gameState.equipmentSlots ?? []).filter(Boolean));
    return {
      shards: gameState.equipmentShards ?? 0,
      kinds: ENGRAVE_KINDS.map((k) => ({ id: k.id, name: k.name, icon: k.icon, desc: k.desc, unit: k.unit, values: [...k.values], cap: k.cap })),
      grades: ENGRAVE_GRADES.map((g) => ({ id: g.id, name: g.name, rate: g.weight })),
      totals: this.gameState.engraveEffects(gameState),
      items: (gameState.equipment ?? [])
        .filter((e) => EQUIPMENT_BY_ID.has(e.itemId))
        .map((e) => {
          const def = EQUIPMENT_BY_ID.get(e.itemId)!;
          return {
            itemId: e.itemId,
            name: def.name,
            icon: def.icon,
            rarity: def.rarity,
            category: def.category,
            equipped: slots.has(e.itemId),
            current: this.engraveView(e.engraveKind ?? '', e.engraveGrade ?? 0),
            pending: this.engraveView(e.pendingKind ?? '', e.pendingGrade ?? 0),
            cost: engraveRollCost(def.rarity),
          };
        })
        .sort((a, b) => Number(b.equipped) - Number(a.equipped) || b.rarity - a.rarity || a.name.localeCompare(b.name, 'ko')),
    };
  }

  async get(userId: string) {
    return this.view(await this.gameState.getOrThrow(userId));
  }

  private item(gameState: GameStateDocument, itemId: string) {
    const def = EQUIPMENT_BY_ID.get(itemId);
    const item = (gameState.equipment ?? []).find((e) => e.itemId === itemId);
    if (!def || !item) throw new BadRequestException('가지고 있지 않은 장비예요.');
    return { def, item };
  }

  // 각인을 굴린다(골드+조각). 나온 각인은 "새 각인"으로 보류되고, 교체하거나 버릴 때까지 기존 각인은 그대로다. 보류 중에 또 굴리면 새로 덮어쓴다.
  async roll(userId: string, itemId: string, random: () => number = Math.random) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const { def, item } = this.item(gameState, itemId);
      const cost = engraveRollCost(def.rarity);
      if ((gameState.equipmentShards ?? 0) < cost.shards) throw new BadRequestException(`조각이 모자라요. ${cost.shards.toLocaleString('ko-KR')}개가 필요해요. (지금 ${(gameState.equipmentShards ?? 0).toLocaleString('ko-KR')}개)`);
      if (gameState.coins < cost.gold) throw new BadRequestException(`골드가 부족해요. ${cost.gold.toLocaleString('ko-KR')} G가 필요해요.`);
      gameState.equipmentShards = (gameState.equipmentShards ?? 0) - cost.shards;
      gameState.coins -= cost.gold;
      const rolled: EngraveRoll = rollEngraving(random);
      item.pendingKind = rolled.kind;
      item.pendingGrade = rolled.grade;
      const message = `${def.icon} ${def.name}에 새 각인이 나왔어요: ${engraveText(rolled.kind, rolled.grade)} (-${cost.gold.toLocaleString('ko-KR')} G · 조각 ${cost.shards}개)`;
      this.gameState.pushLog(gameState, 'sprout', message);
      await gameState.save();
      return { gameState, message, rolled: this.engraveView(rolled.kind, rolled.grade), status: this.view(gameState) };
    });
  }

  // 새 각인으로 교체한다(기존 각인은 사라진다)
  async accept(userId: string, itemId: string) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const { def, item } = this.item(gameState, itemId);
      if (!item.pendingKind || !findEngraveKind(item.pendingKind)) throw new BadRequestException('고를 새 각인이 없어요. 먼저 굴려 주세요.');
      item.engraveKind = item.pendingKind;
      item.engraveGrade = item.pendingGrade;
      item.pendingKind = '';
      item.pendingGrade = 0;
      const message = `${def.icon} ${def.name}에 ${engraveText(item.engraveKind, item.engraveGrade)}을(를) 새겼어요!`;
      this.gameState.pushLog(gameState, 'sprout', message);
      await gameState.save();
      return { gameState, message, status: this.view(gameState) };
    });
  }

  // 새 각인을 버리고 기존 각인을 그대로 둔다
  async discard(userId: string, itemId: string) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const { def, item } = this.item(gameState, itemId);
      if (!item.pendingKind) throw new BadRequestException('버릴 새 각인이 없어요.');
      item.pendingKind = '';
      item.pendingGrade = 0;
      const message = `${def.icon} ${def.name}의 새 각인을 버리고 기존 각인을 지켰어요.`;
      await gameState.save();
      return { gameState, message, status: this.view(gameState) };
    });
  }
}
