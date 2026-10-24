import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { GameStateService } from './game-state.service';
import { RestorationLedger, type LeanRestorationEntry, type LeanRestorationWeek } from './restoration-ledger.service';
import {
  RESTORATION_BOARD_SIZE,
  RESTORATION_DAILY_CAP,
  RESTORATION_MILESTONES,
  RESTORATION_PERSONAL,
  RESTORATION_POINTS,
  findRestorationReward,
  milestoneAt,
  restorationStage,
  rewardText,
} from './restoration-engine';
import { msUntilWeekEnd, previousWeekKeyOf, weekKeyOf } from './underdog-engine';
import { getPuzzleDayKey } from './puzzle-engine';

// 숲 복원 프로젝트: 규칙과 수치는 restoration-engine.ts, 점수 쌓기는 restoration-ledger.service.ts. 여기서는 화면용 정보와 보상 받기를 맡는다.
@Injectable()
export class RestorationService {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly gameState: GameStateService,
    private readonly ledger: RestorationLedger,
    private readonly usersService: UsersService,
  ) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('복원 보상을 처리하는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  // 마일스톤·개인 보상의 진행 상태(도달 여부·받음 여부)
  private tracks(week: LeanRestorationWeek, entry: LeanRestorationEntry | null) {
    const claimed = new Set(entry?.claimed ?? []);
    const myPoints = entry?.points ?? 0;
    const milestones = RESTORATION_MILESTONES.map((m) => {
      const at = milestoneAt(week.goal, m);
      const reached = week.points >= at;
      return { id: m.id, percent: m.percent, points: at, reward: m.reward, rewardText: rewardText(m.reward), reached, claimed: claimed.has(m.id), claimable: reached && !claimed.has(m.id) };
    });
    const personal = RESTORATION_PERSONAL.map((p) => {
      const reached = myPoints >= p.points;
      return { id: p.id, points: p.points, reward: p.reward, rewardText: rewardText(p.reward), reached, claimed: claimed.has(p.id), claimable: reached && !claimed.has(p.id) };
    });
    return { milestones, personal, claimable: [...milestones, ...personal].filter((x) => x.claimable).length };
  }

  async get(userId: string) {
    const now = Date.now();
    const weekKey = weekKeyOf(now);
    const prevKey = previousWeekKeyOf(now);
    const today = getPuzzleDayKey(now);
    const [week, mine, top, prevWeek, prevMine] = await Promise.all([
      this.ledger.ensureWeek(weekKey, now),
      this.ledger.myEntry(userId, weekKey),
      this.ledger.topEntries(weekKey, RESTORATION_BOARD_SIZE),
      this.ledger.getWeek(prevKey),
      this.ledger.myEntry(userId, prevKey),
    ]);
    const users = top.length > 0 ? await this.usersService.findByIds(top.map((t) => t.userId.toString())) : [];
    const names = new Map(users.map((u) => [u._id.toString(), effectiveDisplayName(u)]));
    const ratio = week.goal > 0 ? week.points / week.goal : 0;
    const stage = restorationStage(ratio);
    const dayPoints = mine && mine.dayKey === today ? mine.dayPoints : 0;

    let lastWeek: Record<string, unknown> | null = null;
    if (prevWeek) {
      const t = this.tracks(prevWeek, prevMine);
      if (t.claimable > 0) lastWeek = { week: prevKey, goal: prevWeek.goal, points: prevWeek.points, ratio: prevWeek.goal > 0 ? prevWeek.points / prevWeek.goal : 0, myPoints: prevMine?.points ?? 0, ...t };
    }

    return {
      week: weekKey,
      endsInMs: msUntilWeekEnd(now),
      goal: week.goal,
      points: week.points,
      ratio,
      stage: { id: stage.id, icon: stage.icon, name: stage.name, desc: stage.desc },
      contributors: week.contributors,
      counts: { explores: week.explores, expeditions: week.expeditions, battles: week.battles, dungeons: week.dungeons },
      my: { points: mine?.points ?? 0, dayPoints, dayCap: RESTORATION_DAILY_CAP, todayLeft: Math.max(0, RESTORATION_DAILY_CAP - dayPoints) },
      ...this.tracks(week, mine),
      board: top.map((t, i) => ({ rank: i + 1, displayName: names.get(t.userId.toString()) ?? '숲지기', points: t.points, isMe: t.userId.toString() === userId })),
      lastWeek,
      rules: { ...RESTORATION_POINTS, dailyCap: RESTORATION_DAILY_CAP },
    };
  }

  // 보상 하나를 받는다. last=true면 지난 주 것. 마일스톤은 게이지가 넘었으면 접속한 모두가, 개인 보상은 내 점수가 넘었으면 받는다.
  async claim(userId: string, id: string, last = false) {
    return this.withLock(userId, async () => {
      const found = findRestorationReward(id);
      if (!found) throw new BadRequestException('존재하지 않는 보상이에요.');
      const now = Date.now();
      const weekKey = last ? previousWeekKeyOf(now) : weekKeyOf(now);
      const week = last ? await this.ledger.getWeek(weekKey) : await this.ledger.ensureWeek(weekKey, now);
      if (!week) throw new BadRequestException('그 주의 복원 기록이 없어요.');
      const entry = await this.ledger.myEntry(userId, weekKey);
      const track = this.tracks(week, entry);
      const item = [...track.milestones, ...track.personal].find((x) => x.id === id)!;
      if (item.claimed) throw new BadRequestException('이미 받은 보상이에요.');
      if (!item.reached) throw new BadRequestException(found.kind === 'milestone' ? '아직 복원 게이지가 그만큼 차지 않았어요.' : '아직 내 공헌 점수가 모자라요.');

      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      // 먼저 "받음"으로 표시하고(두 번 눌러도 한 번만), 그다음 지급한다
      if (!(await this.ledger.markClaimed(userId, weekKey, id))) throw new BadRequestException('이미 받은 보상이에요.');
      const r = found.reward;
      gameState.coins += r.gold;
      gameState.stats.earned += r.gold;
      gameState.diamonds += r.diamonds;
      gameState.explorationTickets += r.tickets;
      const text = rewardText(r);
      this.gameState.pushLog(gameState, 'trophy', `숲 복원 프로젝트 ${found.label} 보상: ${text}`);
      await gameState.save();
      return { gameState, message: `${found.label} 보상! ${text}`, reward: r, status: await this.get(userId) };
    });
  }
}
