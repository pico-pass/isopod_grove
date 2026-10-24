import { BadRequestException, Injectable } from '@nestjs/common';
import { SpeciesService } from '../species/species.service';
import { GameStateService } from './game-state.service';
import { GameStateDocument } from './schemas/game-state.schema';
import { MANAGER_GRADES, MANAGER_MAX_CATCHUP_DAYS, findManagerGrade, managerWage } from './manager-engine';
import { daysBetween } from './event-engine';
import { getPuzzleDayKey } from './puzzle-engine';

// 사육장 관리인 고용: 규칙과 월급 공식은 manager-engine.ts, 일하는 효과와 월급 정산은 GameStateService(advance → settleManager).
// 여기서는 현황 화면, 고용, 해고를 맡는다.
@Injectable()
export class ManagerService {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly gameState: GameStateService,
    private readonly speciesService: SpeciesService,
  ) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('관리인 일을 처리하는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  private async view(gameState: GameStateDocument, now: number) {
    const speciesList = await this.speciesService.findAll();
    const potential = this.gameState.hourlyIncomePotential(gameState, speciesList);
    const today = getPuzzleDayKey(now);
    const m = gameState.manager;
    const grade = findManagerGrade(m?.grade);
    const grades = MANAGER_GRADES.map((g) => ({ id: g.id, name: g.name, icon: g.icon, wage: managerWage(g, potential), incomeBonus: g.incomeBonus }));
    return {
      today,
      coins: gameState.coins,
      hourlyIncome: Math.round(potential),
      maxCatchupDays: MANAGER_MAX_CATCHUP_DAYS,
      grades,
      current: grade
        ? {
            grade: grade.id,
            name: grade.name,
            icon: grade.icon,
            incomeBonus: grade.incomeBonus,
            wage: grades.find((g) => g.id === grade.id)!.wage,
            paidThrough: m.paidThrough,
            owedDays: Math.max(0, m.paidThrough ? daysBetween(m.paidThrough, today) : 0),
            totalPaid: m.totalPaid ?? 0,
            hiredAt: m.hiredAt,
          }
        : null,
      totalPaid: m?.totalPaid ?? 0,
    };
  }

  async get(userId: string) {
    return this.view(await this.gameState.getOrThrow(userId), Date.now());
  }

  // 관리인을 고용한다(첫날 월급을 바로 낸다). 이미 다른 등급이 있으면 바꿔 고용한다(오늘 낸 월급은 돌려받지 못한다).
  async hire(userId: string, gradeId: string) {
    const grade = findManagerGrade(gradeId);
    if (!grade) throw new BadRequestException('존재하지 않는 관리인 등급이에요.');
    return this.withLock(userId, async () => {
      const now = Date.now();
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const speciesList = await this.speciesService.findAll();
      // 밀린 월급이 있으면 먼저 정산한다(골드가 모자라 떠났다면 새로 고용한다)
      this.gameState.settleManager(gameState, speciesList, now);
      if (gameState.manager?.grade === grade.id) throw new BadRequestException('이미 고용 중인 관리인이에요.');
      const wage = managerWage(grade, this.gameState.hourlyIncomePotential(gameState, speciesList));
      if (gameState.coins < wage) throw new BadRequestException(`골드가 부족해요. 첫날 월급 ${wage.toLocaleString('ko-KR')} G가 필요해요.`);
      const switching = !!findManagerGrade(gameState.manager?.grade);
      gameState.coins -= wage;
      gameState.manager = { grade: grade.id, hiredAt: now, paidThrough: getPuzzleDayKey(now), totalPaid: (gameState.manager?.totalPaid ?? 0) + wage };
      const message = `${grade.icon} ${grade.name}을(를) ${switching ? '새로 ' : ''}고용했어요! 첫날 월급 ${wage.toLocaleString('ko-KR')} G · 자동 급식·분무·수익 수령, 수익 +${Math.round(grade.incomeBonus * 100)}%`;
      this.gameState.pushLog(gameState, 'coins', message);
      await gameState.save();
      return { gameState, message, status: await this.view(gameState, now) };
    });
  }

  // 관리인을 해고한다(일한 날의 월급은 먼저 정산하고, 낸 월급은 돌려주지 않는다)
  async dismiss(userId: string) {
    return this.withLock(userId, async () => {
      const now = Date.now();
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const speciesList = await this.speciesService.findAll();
      this.gameState.settleManager(gameState, speciesList, now);
      const grade = findManagerGrade(gameState.manager?.grade);
      if (!grade) throw new BadRequestException('고용 중인 관리인이 없어요.');
      gameState.manager = { grade: '', hiredAt: 0, paidThrough: '', totalPaid: gameState.manager?.totalPaid ?? 0 };
      const message = `${grade.icon} ${grade.name}을(를) 내보냈어요.`;
      this.gameState.pushLog(gameState, 'leaf', message);
      await gameState.save();
      return { gameState, message, status: await this.view(gameState, now) };
    });
  }
}
