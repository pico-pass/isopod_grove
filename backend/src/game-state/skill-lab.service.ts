import { BadRequestException, Injectable } from '@nestjs/common';
import { GameStateService } from './game-state.service';
import { GameStateDocument } from './schemas/game-state.schema';
import { SKILL_LAB, findSkillLab, normalizeSkillLab, skillLabCost } from './skill-lab-engine';

const FAMILIES = [
  { family: 'fire', name: '불꽃', icon: '🔥', skill: '불길' },
  { family: 'forest', name: '숲', icon: '🌿', skill: '뿌리 감기' },
  { family: 'frost', name: '서리', icon: '❄️', skill: '빙결' },
] as const;

// 계열 기술 연구소: 규칙과 수치는 skill-lab-engine.ts. 여기서는 연구 현황과 올리기를 맡는다(효과는 GameStateService.duelSkillOf가 전투에 넣는다).
@Injectable()
export class SkillLabService {
  private readonly inFlight = new Set<string>();

  constructor(private readonly gameState: GameStateService) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('연구를 처리하는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  private view(gameState: GameStateDocument) {
    const levels = normalizeSkillLab(gameState.familyLab);
    return {
      families: FAMILIES.map((f) => ({
        family: f.family,
        name: f.name,
        icon: f.icon,
        skillName: f.skill,
        nodes: SKILL_LAB.filter((n) => n.family === f.family).map((n) => ({
          id: n.id,
          name: n.name,
          icon: n.icon,
          desc: n.desc,
          max: n.max,
          level: levels[n.id],
          next: levels[n.id] >= n.max ? null : skillLabCost(n, levels[n.id] + 1),
        })),
      })),
    };
  }

  async get(userId: string) {
    return this.view(await this.gameState.getOrThrow(userId));
  }

  // 연구를 한 단계 올린다(골드+다이아). 이미 진행 중인 직접 전투에도 다음 행동부터 바로 적용된다.
  async upgrade(userId: string, id: string) {
    const node = findSkillLab(id);
    if (!node) throw new BadRequestException('존재하지 않는 연구예요.');
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const level = normalizeSkillLab(gameState.familyLab)[node.id];
      if (level >= node.max) throw new BadRequestException('이미 최고 단계예요.');
      const cost = skillLabCost(node, level + 1);
      if (gameState.coins < cost.gold) throw new BadRequestException(`골드가 부족해요. ${cost.gold.toLocaleString('ko-KR')} G가 필요해요.`);
      if (gameState.diamonds < cost.diamonds) throw new BadRequestException(`다이아가 부족해요. 💎 ${cost.diamonds}개가 필요해요.`);
      gameState.coins -= cost.gold;
      gameState.diamonds -= cost.diamonds;
      if (!gameState.familyLab) gameState.familyLab = new Map();
      gameState.familyLab.set(node.id, level + 1);
      const message = `${node.icon} ${node.name}을(를) ${level + 1}단계로 올렸어요! (-${cost.gold.toLocaleString('ko-KR')} G · 💎 ${cost.diamonds}개)`;
      this.gameState.pushLog(gameState, 'coins', message);
      await gameState.save();
      return { gameState, message, status: this.view(gameState) };
    });
  }
}
