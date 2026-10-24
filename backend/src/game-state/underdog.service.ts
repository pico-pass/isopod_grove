import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GameState, GameStateDocument } from './schemas/game-state.schema';
import { UnderdogEntry, UnderdogEntryDocument } from './schemas/underdog-entry.schema';
import { SpeciesService } from '../species/species.service';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { GameStateService, dayKey } from './game-state.service';
import { getBattleLevel, rollCombatStats, simulateBattle } from './game-engine';
import {
  UNDERDOG_BOARD_SIZE,
  UNDERDOG_DAILY_MATCHES,
  UNDERDOG_LOSS_POINTS,
  UNDERDOG_MIN_MATCHES_FOR_REWARD,
  UNDERDOG_NPC_LEVEL_MIN,
  UNDERDOG_NPC_RATE,
  UNDERDOG_RARITY,
  UNDERDOG_WIN_GOLD,
  UNDERDOG_WIN_LEVEL_BONUS_MAX,
  UNDERDOG_WIN_POINTS,
  msUntilWeekEnd,
  previousWeekKeyOf,
  rankUnderdog,
  underdogPointsDelta,
  underdogReward,
  weekKeyOf,
} from './underdog-engine';

type LeanEntry = { _id: Types.ObjectId; weekKey: string; userId: Types.ObjectId; speciesId: string; points: number; wins: number; losses: number; matchDay: string; matchesToday: number; claimed: boolean };

// 하극상 대회: 규칙과 수치는 underdog-engine.ts, 여기서는 주간 기록(underdog_entries)을 읽고 쓰고 경기를 서버에서 치른다.
@Injectable()
export class UnderdogService {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly gameState: GameStateService,
    private readonly speciesService: SpeciesService,
    private readonly usersService: UsersService,
    @InjectModel(GameState.name) private readonly gameStateModel: Model<GameStateDocument>,
    @InjectModel(UnderdogEntry.name) private readonly entryModel: Model<UnderdogEntryDocument>,
  ) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('하극상 대회를 처리하는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  private async myEntry(userId: string, weekKey: string): Promise<LeanEntry | null> {
    return this.entryModel.findOne({ weekKey, userId: new Types.ObjectId(userId) }).lean<LeanEntry>();
  }

  private async weekRows(weekKey: string, limit = 1000): Promise<LeanEntry[]> {
    return this.entryModel.find({ weekKey }).sort({ points: -1, wins: -1 }).limit(limit).lean<LeanEntry[]>();
  }

  private entryView(e: LeanEntry, today: string) {
    return {
      speciesId: e.speciesId,
      points: e.points,
      wins: e.wins,
      losses: e.losses,
      matches: e.wins + e.losses,
      matchesLeft: Math.max(0, UNDERDOG_DAILY_MATCHES - (e.matchDay === today ? e.matchesToday : 0)),
    };
  }

  async get(userId: string) {
    const now = Date.now();
    const week = weekKeyOf(now);
    const prevWeek = previousWeekKeyOf(now);
    const today = dayKey(now);
    const [gameState, speciesList, mine, rows, prevMine] = await Promise.all([
      this.gameState.getOrThrow(userId),
      this.speciesService.findAll(),
      this.myEntry(userId, week),
      this.weekRows(week),
      this.myEntry(userId, prevWeek),
    ]);
    const ranked = rankUnderdog(rows.map((r) => ({ ...r, userId: r.userId.toString() })));
    const top = ranked.slice(0, UNDERDOG_BOARD_SIZE);
    const myRow = ranked.find((r) => r.userId === userId);
    const nameIds = [...new Set([...top.map((r) => r.userId)])];
    const users = nameIds.length > 0 ? await this.usersService.findByIds(nameIds) : [];
    const names = new Map(users.map((u) => [u._id.toString(), effectiveDisplayName(u)]));
    const bySpecies = new Map(speciesList.map((s) => [s.speciesId, s]));
    const board = top.map((r) => ({
      rank: r.rank,
      userId: r.userId,
      displayName: names.get(r.userId) ?? '숲지기',
      isMe: r.userId === userId,
      points: r.points,
      wins: r.wins,
      losses: r.losses,
      speciesId: r.speciesId,
      speciesName: bySpecies.get(r.speciesId)?.name ?? r.speciesId,
      image: bySpecies.get(r.speciesId)?.image,
      filter: bySpecies.get(r.speciesId)?.filter ?? 'none',
    }));

    let lastWeek: Record<string, unknown> | null = null;
    if (prevMine) {
      const prevRows = rankUnderdog((await this.weekRows(prevWeek)).map((r) => ({ ...r, userId: r.userId.toString() })));
      const row = prevRows.find((r) => r.userId === userId);
      const matches = prevMine.wins + prevMine.losses;
      const reward = row ? underdogReward(row.rank, matches) : null;
      lastWeek = { week: prevWeek, rank: row?.rank ?? null, participants: prevRows.length, points: prevMine.points, wins: prevMine.wins, losses: prevMine.losses, matches, reward, claimed: prevMine.claimed, claimable: !!reward && !prevMine.claimed };
    }

    const eligible = speciesList
      .filter((s) => s.rarity === UNDERDOG_RARITY && this.gameState.totalOf(gameState, s.speciesId) > 0)
      .map((s) => ({ speciesId: s.speciesId, name: s.name, image: s.image, filter: s.filter, family: s.family, level: getBattleLevel(gameState.battleXp.get(s.speciesId) || 0) }));

    return {
      week,
      weekEndsInMs: msUntilWeekEnd(now),
      rules: {
        dailyMatches: UNDERDOG_DAILY_MATCHES,
        winPoints: UNDERDOG_WIN_POINTS,
        winLevelBonusMax: UNDERDOG_WIN_LEVEL_BONUS_MAX,
        lossPoints: UNDERDOG_LOSS_POINTS,
        npcRate: UNDERDOG_NPC_RATE,
        winGold: UNDERDOG_WIN_GOLD,
        minMatchesForReward: UNDERDOG_MIN_MATCHES_FOR_REWARD,
        rewards: [1, 2, 3, 10, 99].map((rank) => ({ rank, ...underdogReward(rank, UNDERDOG_MIN_MATCHES_FOR_REWARD)! })),
      },
      me: mine ? { ...this.entryView(mine, today), rank: myRow?.rank ?? null } : null,
      eligible,
      board,
      participants: ranked.length,
      lastWeek,
    };
  }

  // 이번 주 출전 식구를 정한다(희귀도 '일반'만). 점수와 전적은 그대로 두고 식구만 바꾼다.
  async enter(userId: string, speciesId: string) {
    const gameState = await this.gameState.getOrThrow(userId);
    this.gameState.guardPaused(gameState);
    if (!(this.gameState.totalOf(gameState, speciesId) > 0)) throw new BadRequestException('아직 만나지 못한 식구예요.');
    const species = await this.speciesService.findOne(speciesId);
    if (!species) throw new BadRequestException('존재하지 않는 종이에요.');
    if (species.rarity !== UNDERDOG_RARITY) throw new BadRequestException('하극상 대회에는 희귀도 "일반" 콩벌레만 나갈 수 있어요.');
    const week = weekKeyOf();
    await this.entryModel.updateOne(
      { weekKey: week, userId: new Types.ObjectId(userId) },
      { $set: { speciesId }, $setOnInsert: { points: 0, wins: 0, losses: 0, matchDay: '', matchesToday: 0, claimed: false } },
      { upsert: true },
    );
    return { gameState, message: `${species.name}이(가) 이번 주 하극상 대회에 출전해요!`, status: await this.get(userId) };
  }

  // 상대 한 명을 미리 보여 준다(읽기 전용 — 다시 눌러 다른 상대를 볼 수 있다). 비슷한 승점의 출전자를 우선하고, 없으면 야생 선수다.
  async findOpponent(userId: string) {
    const week = weekKeyOf();
    const mine = await this.myEntry(userId, week);
    if (!mine) throw new BadRequestException('먼저 출전할 식구를 정해 주세요.');
    const gameState = await this.gameState.getOrThrow(userId);
    const myLevel = getBattleLevel(gameState.battleXp.get(mine.speciesId) || 0);
    const candidates = (await this.weekRows(week, 200))
      .filter((r) => r.userId.toString() !== userId)
      .sort((a, b) => Math.abs(a.points - mine.points) - Math.abs(b.points - mine.points))
      .slice(0, 10)
      .sort(() => Math.random() - 0.5);
    for (const c of candidates) {
      const resolved = await this.resolveHuman(c);
      if (resolved) return { opponent: { userId: c.userId.toString(), npc: false, displayName: resolved.displayName, speciesId: c.speciesId, speciesName: resolved.speciesName, image: resolved.image, filter: resolved.filter, level: resolved.level, points: c.points } };
    }
    return { opponent: { userId: '', npc: true, displayName: '야생 선수', speciesId: '', speciesName: '야생 일반 콩벌레', image: undefined, filter: 'none', level: Math.max(1, Math.round(myLevel * (UNDERDOG_NPC_LEVEL_MIN + 0.2 * 0.5))), points: 0 } };
  }

  // 출전자의 "지금" 식구 데이터를 서버에서 다시 읽는다(클라이언트가 보여 준 상대·능력치는 믿지 않는다). 식구를 더 안 가졌으면 null.
  private async resolveHuman(entry: LeanEntry) {
    const doc = await this.gameStateModel
      .findOne({ userId: entry.userId }, { terrariums: 1, battleXp: 1 })
      .lean<{ terrariums?: { population?: Record<string, number> }[]; battleXp?: Record<string, number> }>();
    if (!doc) return null;
    const owns = (doc.terrariums ?? []).some((t) => (t.population?.[entry.speciesId] ?? 0) > 0);
    if (!owns) return null;
    const species = await this.speciesService.findOne(entry.speciesId);
    if (!species || species.rarity !== UNDERDOG_RARITY) return null;
    const user = await this.usersService.findById(entry.userId.toString());
    return { displayName: user ? effectiveDisplayName(user) : '숲지기', speciesName: species.name, image: species.image, filter: species.filter, level: getBattleLevel(doc.battleXp?.[entry.speciesId] || 0) };
  }

  async match(userId: string, opponentUserId: string) {
    if (opponentUserId && !Types.ObjectId.isValid(opponentUserId)) throw new BadRequestException('알 수 없는 상대예요.');
    if (opponentUserId === userId) throw new BadRequestException('나와는 겨룰 수 없어요.');
    return this.withLock(userId, async () => {
      const now = Date.now();
      const week = weekKeyOf(now);
      const today = dayKey(now);
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const mine = await this.myEntry(userId, week);
      if (!mine) throw new BadRequestException('먼저 출전할 식구를 정해 주세요.');
      if (!(this.gameState.totalOf(gameState, mine.speciesId) > 0)) throw new BadRequestException('출전 식구가 사육장에 없어요. 다른 일반 콩벌레를 출전시켜 주세요.');
      const playedToday = mine.matchDay === today ? mine.matchesToday : 0;
      if (playedToday >= UNDERDOG_DAILY_MATCHES) throw new BadRequestException(`오늘의 하극상 대회 경기 ${UNDERDOG_DAILY_MATCHES}번을 모두 치렀어요. 내일 다시 도전해 주세요.`);

      const mySpecies = await this.speciesService.findOne(mine.speciesId);
      if (!mySpecies) throw new BadRequestException('존재하지 않는 종이에요.');
      const myLevel = getBattleLevel(gameState.battleXp.get(mine.speciesId) || 0);
      let oppLevel: number;
      let oppName = '야생 선수';
      let oppSpeciesName = '야생 일반 콩벌레';
      let oppImage: string | undefined;
      let oppFilter = 'none';
      let oppSpeciesId = '';
      const vsNpc = !opponentUserId;
      if (vsNpc) {
        oppLevel = Math.max(1, Math.round(myLevel * (UNDERDOG_NPC_LEVEL_MIN + Math.random() * 0.2)));
      } else {
        const entry = await this.myEntry(opponentUserId, week);
        const resolved = entry ? await this.resolveHuman(entry) : null;
        if (!entry || !resolved) throw new BadRequestException('이번 주에 출전한 상대가 아니에요. 다른 상대를 찾아 주세요.');
        oppLevel = resolved.level;
        oppName = resolved.displayName;
        oppSpeciesName = resolved.speciesName;
        oppImage = resolved.image;
        oppFilter = resolved.filter;
        oppSpeciesId = entry.speciesId;
      }

      // 장비 없이 레벨과 개체 편차로만 겨룬다
      const myStats = rollCombatStats(UNDERDOG_RARITY, myLevel, Math.random);
      const oppStats = rollCombatStats(UNDERDOG_RARITY, oppLevel, Math.random);
      const battle = simulateBattle(myStats, oppStats, Math.random);
      const won = battle.winner === 'me';
      const delta = underdogPointsDelta(won, myLevel, oppLevel, vsNpc);
      const points = Math.max(0, mine.points + delta);
      await this.entryModel.updateOne(
        { _id: mine._id },
        { $set: { points, matchDay: today, matchesToday: playedToday + 1, wins: mine.wins + (won ? 1 : 0), losses: mine.losses + (won ? 0 : 1) } },
      );
      let gold = 0;
      if (won) {
        gold = UNDERDOG_WIN_GOLD;
        gameState.coins += gold;
        gameState.stats.earned += gold;
      }
      this.gameState.pushLog(gameState, 'trophy', `하극상 대회 ${won ? '승리' : '패배'}: ${oppName}의 ${oppSpeciesName}와(과) 겨뤄 승점 ${delta >= 0 ? '+' : ''}${delta}`);
      await gameState.save();
      const fresh = await this.myEntry(userId, week);
      return {
        gameState,
        message: won ? `🏆 승리! 승점 +${points - mine.points}${gold > 0 ? ` · +${gold.toLocaleString('ko-KR')} G` : ''}` : `패배… 승점 ${points - mine.points}`,
        result: {
          won,
          vsNpc,
          pointsDelta: points - mine.points,
          gold,
          log: battle.log,
          mine: { speciesId: mySpecies.speciesId, name: mySpecies.name, image: mySpecies.image, filter: mySpecies.filter, rarity: mySpecies.rarity, level: myLevel, stats: myStats },
          opponent: { speciesId: oppSpeciesId, name: oppSpeciesName, displayName: oppName, speciesName: oppSpeciesName, image: oppImage, filter: oppFilter, rarity: UNDERDOG_RARITY, level: oppLevel, stats: oppStats },
        },
        status: await this.get(userId),
        me: fresh ? this.entryView(fresh, today) : null,
      };
    });
  }

  // 지난 주 순위 보상을 받는다(경기를 최소 몇 번 치러야 해요).
  async claim(userId: string) {
    return this.withLock(userId, async () => {
      const prevWeek = previousWeekKeyOf();
      const mine = await this.myEntry(userId, prevWeek);
      if (!mine) throw new BadRequestException('지난 주에 출전한 기록이 없어요.');
      const rows = rankUnderdog((await this.weekRows(prevWeek)).map((r) => ({ ...r, userId: r.userId.toString() })));
      const row = rows.find((r) => r.userId === userId);
      const reward = row ? underdogReward(row.rank, mine.wins + mine.losses) : null;
      if (!reward) throw new BadRequestException(`지난 주 보상은 경기를 ${UNDERDOG_MIN_MATCHES_FOR_REWARD}번 이상 치러야 받을 수 있어요.`);
      // 먼저 "받음"으로 바꾸면서 읽어서 두 번 눌러도 한 번만 받는다
      const flipped = await this.entryModel.findOneAndUpdate({ _id: mine._id, claimed: false }, { $set: { claimed: true } }, { returnDocument: 'before' });
      if (!flipped) throw new BadRequestException('이미 받은 보상이에요.');
      const gameState = await this.gameState.getOrThrow(userId);
      gameState.coins += reward.gold;
      gameState.stats.earned += reward.gold;
      gameState.diamonds += reward.diamonds;
      this.gameState.pushLog(gameState, 'trophy', `지난 주 하극상 대회 ${row!.rank}위 보상: ${reward.gold.toLocaleString('ko-KR')} G${reward.diamonds ? ` · 💎 ${reward.diamonds}개` : ''}`);
      await gameState.save();
      return {
        gameState,
        message: `${reward.label} 보상! +${reward.gold.toLocaleString('ko-KR')} G${reward.diamonds ? ` · 💎 ${reward.diamonds}개` : ''}`,
        reward,
        rank: row!.rank,
        status: await this.get(userId),
      };
    });
  }
}
