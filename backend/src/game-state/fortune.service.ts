import { BadRequestException, Injectable } from '@nestjs/common';
import { GameStateService } from './game-state.service';
import { GameStateDocument } from './schemas/game-state.schema';
import {
  FORTUNE_COLORS,
  FORTUNE_GRADES,
  FORTUNE_LINES,
  FORTUNE_STREAK_BONUS,
  FORTUNE_STREAK_EVERY,
  activeFortuneStreak,
  drawFortune,
  findFortuneGrade,
  fortuneDayRange,
  fortuneStreakBonus,
  nextFortuneStreak,
} from './fortune-engine';
import { getPuzzleDayKey } from './puzzle-engine';
import { rewardText } from './restoration-engine';

const FAMILY_INFO = { fire: { icon: '🔥', name: '불꽃' }, forest: { icon: '🌿', name: '숲' }, frost: { icon: '❄️', name: '서리' } } as const;

// 오늘의 운세: 규칙과 수치는 fortune-engine.ts. 여기서는 하루 한 번 뽑기와 화면용 정보를 맡는다.
@Injectable()
export class FortuneService {
  private readonly inFlight = new Set<string>();

  constructor(private readonly gameState: GameStateService) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('운세를 뽑는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  // 저장된 운세 → 화면용 정보
  private view(gameState: GameStateDocument, now: number) {
    const today = getPuzzleDayKey(now);
    const f = gameState.fortune;
    const drawn = !!f && f.day === today && !!findFortuneGrade(f.gradeId);
    const streak = activeFortuneStreak(f, today);
    let fortune: Record<string, unknown> | null = null;
    if (drawn) {
      const grade = findFortuneGrade(f.gradeId)!;
      const family = FAMILY_INFO[f.family as keyof typeof FAMILY_INFO] ?? FAMILY_INFO.forest;
      fortune = {
        grade: { id: grade.id, name: grade.name, icon: grade.icon },
        family: f.family,
        familyName: family.name,
        familyIcon: family.icon,
        color: FORTUNE_COLORS[f.color] ?? FORTUNE_COLORS[0],
        number: f.number,
        line: FORTUNE_LINES[f.line] ?? FORTUNE_LINES[0],
        reward: { gold: grade.gold, diamonds: grade.diamonds, tickets: grade.tickets },
        rewardText: rewardText({ gold: grade.gold, diamonds: grade.diamonds, tickets: grade.tickets }),
        effects: { breedPercent: grade.breedPercent, exploreMult: grade.exploreMult },
      };
    }
    return {
      today,
      drawn,
      resetsInMs: fortuneDayRange(today).to - now,
      fortune,
      streak,
      best: f?.best ?? 0,
      // 다음 연속 보너스까지 며칠(오늘 뽑았고 막 보너스 날이면 다시 7일)
      nextBonusIn: FORTUNE_STREAK_EVERY - (streak % FORTUNE_STREAK_EVERY),
      streakEvery: FORTUNE_STREAK_EVERY,
      streakBonusText: rewardText(FORTUNE_STREAK_BONUS),
      grades: FORTUNE_GRADES.map((g) => ({ id: g.id, name: g.name, icon: g.icon, rate: g.weight, rewardText: rewardText({ gold: g.gold, diamonds: g.diamonds, tickets: g.tickets }), breedPercent: g.breedPercent, exploreMult: g.exploreMult })),
    };
  }

  async get(userId: string) {
    return this.view(await this.gameState.getOrThrow(userId), Date.now());
  }

  // 오늘의 운세를 뽑는다(하루 한 번). 뽑는 순간 등급에 따른 보상이 들어오고 연속 7일마다 보너스가 더해진다.
  async draw(userId: string) {
    return this.withLock(userId, async () => {
      const now = Date.now();
      const today = getPuzzleDayKey(now);
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      if (gameState.fortune?.day === today) throw new BadRequestException('오늘의 운세는 이미 뽑았어요. 내일 다시 만나요!');

      const result = drawFortune(userId, today);
      const grade = findFortuneGrade(result.gradeId)!;
      const streak = nextFortuneStreak(gameState.fortune, today);
      const bonus = fortuneStreakBonus(streak);
      const gold = grade.gold + (bonus?.gold ?? 0);
      const diamonds = grade.diamonds + (bonus?.diamonds ?? 0);
      const tickets = grade.tickets + (bonus?.tickets ?? 0);
      gameState.coins += gold;
      gameState.stats.earned += gold;
      gameState.diamonds += diamonds;
      gameState.explorationTickets += tickets;
      gameState.fortune = { day: today, gradeId: result.gradeId, family: result.family, color: result.color, number: result.number, line: result.line, streak, best: Math.max(gameState.fortune?.best ?? 0, streak) };

      const rewardTextAll = rewardText({ gold, diamonds, tickets });
      const family = FAMILY_INFO[result.family];
      this.gameState.pushLog(gameState, 'trophy', `🔮 오늘의 운세 ${grade.name}! 행운 계열 ${family.name} · ${rewardTextAll}${bonus ? ` (${streak}일 연속 보너스 포함)` : ''}`);
      await gameState.save();
      return {
        gameState,
        message: `${grade.icon} 오늘의 운세는 ${grade.name}! ${rewardTextAll}${bonus ? ` · ${streak}일 연속 보너스!` : ''}`,
        status: this.view(gameState, now),
      };
    });
  }
}
