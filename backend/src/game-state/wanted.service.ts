import { BadRequestException, Injectable } from '@nestjs/common';
import type { Species } from '../species/schemas/species.schema';
import { SpeciesService } from '../species/species.service';
import { resolveFamily } from '../species/species.family';
import { GameStateService, dayKey, type DuelFighterView } from './game-state.service';
import type { GameStateDocument } from './schemas/game-state.schema';
import { starBonuses } from './awaken-engine';
import { DungeonDuel, WantedPosterRecord, WantedState } from './schemas/game-state.schema';
import {
  BATTLE_MAX_TURNS,
  BOSS_PATTERNS,
  DUEL_ACTIONS,
  DUEL_ACTION_INFO,
  applyBattleRules,
  getBattleLevel,
  getDuelActionStates,
  playDuelTurn,
  rhythmStrikeBonus,
  rollBossStats,
  rollCombatStats,
  type BattleEnvironmentId,
  type BattleRulesView,
  type BattleTurn,
  type BossDuelState,
  type BossPattern,
  type CombatStats,
  type DuelAction,
} from './game-engine';
import {
  WANTED_DAILY_ATTEMPTS,
  WANTED_MAX_POSTERS,
  WANTED_MILESTONES,
  WANTED_TIERS,
  checkWantedFighter,
  describeWantedCondition,
  findWantedTier,
  getWantedPoster,
  wantedBannedActions,
  wantedBossStats,
  wantedEffectiveLevel,
  wantedPatterns,
  wantedUsesEquipment,
  type WantedPoster,
  type WantedTier,
} from './wanted-engine';

const TIER_ORDER = WANTED_TIERS.map((t) => t.id as string);

// 현상수배 보스: 규칙과 수치는 wanted-engine.ts, 여기서는 서버가 상태를 들고 한 번에 한 턴씩 진행한다.
@Injectable()
export class WantedService {
  // 같은 유저의 요청이 겹치면 보상이나 도전 횟수가 두 번 처리될 수 있어 막는다.
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly gameState: GameStateService,
    private readonly speciesService: SpeciesService,
  ) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('수배 전투를 처리하는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  private async todayPoster(speciesList: Species[]): Promise<WantedPoster> {
    const poster = getWantedPoster(dayKey(), speciesList.map((s) => s.speciesId));
    if (!poster) throw new BadRequestException('수배할 종이 없어요.');
    return poster;
  }

  // 예전 계정(wanted 필드가 없는 문서)도 쓸 수 있게 채워 두고, 날짜가 바뀌었으면 오늘 현황만 비운다(도감은 그대로).
  private ensureState(gameState: GameStateDocument, today: string): WantedState {
    if (!gameState.wanted) {
      gameState.wanted = { day: '', attemptsUsed: 0, clearedTiers: [], duel: null, tier: '', fighterSpeciesId: '', fighterLevel: 1, posters: [], claimedMilestones: [] } as WantedState;
    }
    const w = gameState.wanted;
    if (w.day !== today && !w.duel) {
      w.day = today;
      w.attemptsUsed = 0;
      w.clearedTiers = [];
      w.tier = '';
      w.fighterSpeciesId = '';
    }
    return w;
  }

  private toDuelState(duel: DungeonDuel): BossDuelState {
    return {
      turn: duel.turn,
      myHp: duel.myHp,
      bossHp: duel.enemyHp,
      enraged: duel.enraged,
      charged: duel.charged,
      strikeCooldown: duel.strikeCooldown,
      healUsed: duel.healUsed,
      skillCooldown: duel.skillCooldown ?? 0,
      burnTurns: duel.burnTurns ?? 0,
      rootTurns: duel.rootTurns ?? 0,
    };
  }

  private fighterView(s: Species, name: string, stats: CombatStats, level: number): DuelFighterView {
    return { speciesId: s.speciesId, name, image: s.image, filter: s.filter, rarity: s.rarity, stats, level, family: resolveFamily(s) };
  }

  private bossView(species: Species) {
    return { speciesId: species.speciesId, name: species.name, image: species.image, filter: species.filter, rarity: species.rarity, family: resolveFamily(species) };
  }

  private duelView(gameState: GameStateDocument, w: WantedState, poster: WantedPoster, speciesList: Species[]) {
    const duel = w.duel;
    if (!duel) return null;
    const mySpecies = speciesList.find((s) => s.speciesId === w.fighterSpeciesId);
    const bossSpecies = speciesList.find((s) => s.speciesId === duel.enemySpeciesId);
    if (!mySpecies || !bossSpecies) return null;
    const banned = new Set(wantedBannedActions(poster.conditions));
    const core = this.gameState.duelCoreView(
      this.fighterView(mySpecies, this.gameState.displayNameFor(gameState, mySpecies.speciesId, mySpecies.name), { hp: duel.mineHp, atk: duel.mineAtk, def: duel.mineDef }, w.fighterLevel),
      this.fighterView(bossSpecies, bossSpecies.name, { hp: duel.enemyHpMax, atk: duel.enemyAtk, def: duel.enemyDef }, w.fighterLevel),
      (duel.enemyPatterns ?? []) as BossPattern[],
      this.toDuelState(duel),
      duel.log as unknown as BattleTurn[],
      this.gameState.duelSkillOf(mySpecies, gameState),
    );
    // 오늘의 조건으로 못 쓰는 행동은 눌 수 없게 표시한다
    const actions = core.actions.map((a) =>
      banned.has(a.id as DuelAction) ? { ...a, available: false, reason: '오늘의 수배 조건으로 쓸 수 없어요' } : a,
    );
    return { tier: w.tier, ...core, actions };
  }

  private collectionView(w: WantedState, speciesList: Species[]) {
    const bySpecies = new Map(speciesList.map((s) => [s.speciesId, s]));
    const posters = [...(w.posters ?? [])]
      .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
      .map((p) => {
        const sp = bySpecies.get(p.speciesId);
        return { day: p.day, tier: p.tier, speciesId: p.speciesId, name: sp?.name ?? p.speciesId, image: sp?.image, filter: sp?.filter ?? 'none', rarity: sp?.rarity ?? 0 };
      });
    const total = (w.posters ?? []).length;
    const claimed = new Set(w.claimedMilestones ?? []);
    return {
      total,
      posters,
      milestones: WANTED_MILESTONES.map((m) => ({ count: m.count, diamonds: m.diamonds, claimed: claimed.has(m.count), reached: total >= m.count })),
    };
  }

  private buildStatus(gameState: GameStateDocument, w: WantedState, poster: WantedPoster, speciesList: Species[]) {
    const bossSpecies = speciesList.find((s) => s.speciesId === poster.bossSpeciesId);
    const cleared = new Set(w.day === poster.day ? w.clearedTiers ?? [] : []);
    const used = w.day === poster.day ? w.attemptsUsed ?? 0 : 0;
    const fighters = speciesList
      .filter((s) => this.gameState.totalOf(gameState, s.speciesId) > 0)
      .map((s) => {
        const reason = checkWantedFighter(poster.conditions, { rarity: s.rarity, family: resolveFamily(s) });
        const level = getBattleLevel(gameState.battleXp.get(s.speciesId) || 0);
        return { speciesId: s.speciesId, eligible: reason === null, reason, level, effectiveLevel: wantedEffectiveLevel(poster.conditions, level) };
      });
    return {
      poster: {
        day: poster.day,
        boss: bossSpecies ? this.bossView(bossSpecies) : null,
        environment: poster.environment,
        conditions: poster.conditions.map((c) => ({ ...c, text: describeWantedCondition(c) })),
        tiers: WANTED_TIERS.map((t) => ({
          id: t.id,
          name: t.name,
          icon: t.icon,
          stage: t.stage,
          gold: t.gold,
          diamonds: t.diamonds,
          cleared: cleared.has(t.id),
          stats: wantedBossStats(t),
          patterns: wantedPatterns(poster, t).map((p) => BOSS_PATTERNS[p]),
        })),
      },
      attempts: { used, limit: WANTED_DAILY_ATTEMPTS, left: Math.max(0, WANTED_DAILY_ATTEMPTS - used) },
      fighters,
      duel: this.duelView(gameState, w, poster, speciesList),
      collection: this.collectionView(w, speciesList),
    };
  }

  async get(userId: string) {
    const gameState = await this.gameState.getOrThrow(userId);
    const speciesList = await this.speciesService.findAll();
    const poster = await this.todayPoster(speciesList);
    // 날짜가 바뀐 채 남은 어제의 전투는 접는다(도전은 이미 센 상태다). 조회만 하는 경우는 저장하지 않는다(기본값은 메모리에서만 채운다).
    const stale = !!(gameState.wanted?.duel && gameState.wanted.day !== poster.day);
    if (stale) gameState.wanted.duel = null;
    const w = this.ensureState(gameState, poster.day);
    if (stale) await gameState.save();
    return this.buildStatus(gameState, w, poster, speciesList);
  }

  async start(userId: string, speciesId: string, tierId: string) {
    const tier = findWantedTier(tierId);
    if (!tier) throw new BadRequestException('알 수 없는 등급이에요.');
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const speciesList = await this.speciesService.findAll();
      const poster = await this.todayPoster(speciesList);
      if (gameState.wanted?.duel && gameState.wanted.day !== poster.day) gameState.wanted.duel = null; // 어제의 남은 전투
      const w = this.ensureState(gameState, poster.day);
      if (w.duel) throw new BadRequestException('진행 중인 수배 전투가 있어요. 이어서 하거나 포기해 주세요.');
      if (!(this.gameState.totalOf(gameState, speciesId) > 0)) throw new BadRequestException('아직 만나지 못한 식구예요.');
      const mySpecies = speciesList.find((s) => s.speciesId === speciesId);
      const bossSpecies = speciesList.find((s) => s.speciesId === poster.bossSpeciesId);
      if (!mySpecies || !bossSpecies) throw new BadRequestException('존재하지 않는 종이에요.');
      if ((w.clearedTiers ?? []).includes(tier.id)) throw new BadRequestException(`오늘 ${tier.name}등급은 이미 깼어요.`);
      if ((w.attemptsUsed ?? 0) >= WANTED_DAILY_ATTEMPTS) {
        throw new BadRequestException(`오늘의 수배 도전 ${WANTED_DAILY_ATTEMPTS}회를 모두 썼어요. 내일 새 수배서가 붙어요.`);
      }
      const myFamily = resolveFamily(mySpecies);
      const reason = checkWantedFighter(poster.conditions, { rarity: mySpecies.rarity, family: myFamily });
      if (reason) throw new BadRequestException(reason);

      const realLevel = getBattleLevel(gameState.battleXp.get(speciesId) || 0);
      const level = wantedEffectiveLevel(poster.conditions, realLevel);
      // 장비 금지 조건이면 장비 보너스가 없고, 레벨 제한이 걸려 레벨이 깎였으면 각성 ★ 보너스도 쓰지 않는다
      const bonuses = wantedUsesEquipment(poster.conditions) ? this.gameState.battleBonuses(gameState, speciesId, level === realLevel) : level === realLevel ? starBonuses(this.gameState.starsOf(gameState, speciesId)) : undefined;
      const mine = rollCombatStats(mySpecies.rarity, level, Math.random, bonuses);
      // 장비 금지 조건이 아닐 때만 장비 각인의 상성 연마가 적용된다
      const matchupExtra = wantedUsesEquipment(poster.conditions) ? this.gameState.engraveEffects(gameState).matchup : 0;
      const applied = applyBattleRules(mine, rollBossStats(wantedBossStats(tier)), myFamily, resolveFamily(bossSpecies), poster.environment as BattleEnvironmentId, matchupExtra);
      const patterns = wantedPatterns(poster, tier);
      w.attemptsUsed = (w.attemptsUsed ?? 0) + 1; // 여기서부터는 도전으로 센다
      w.tier = tier.id;
      w.fighterSpeciesId = speciesId;
      w.fighterLevel = level;
      w.duel = {
        kind: 'wanted',
        enemySpeciesId: bossSpecies.speciesId,
        enemyFamily: resolveFamily(bossSpecies),
        environment: poster.environment,
        enemyPatterns: patterns,
        mineHp: applied.mine.hp,
        mineAtk: applied.mine.atk,
        mineDef: applied.mine.def,
        enemyHpMax: applied.enemy.hp,
        enemyAtk: applied.enemy.atk,
        enemyDef: applied.enemy.def,
        turn: 1,
        myHp: applied.mine.hp,
        enemyHp: applied.enemy.hp,
        enraged: false,
        charged: false,
        strikeCooldown: 0,
        skillCooldown: 0,
        burnTurns: 0,
        rootTurns: 0,
        healUsed: false,
        log: [],
        guardianOwnerId: '',
        guardianOwnerName: '',
      } as DungeonDuel;
      await gameState.save();
      return {
        gameState,
        message: `${tier.icon} ${tier.name}등급 수배 전투를 시작했어요! 행동을 골라 주세요.`,
        status: this.buildStatus(gameState, w, poster, speciesList),
        rules: applied.rules as BattleRulesView | null,
        result: null,
      };
    });
  }

  async act(userId: string, action: string, rhythm?: number) {
    if (!(DUEL_ACTIONS as readonly string[]).includes(action)) throw new BadRequestException('알 수 없는 행동이에요.');
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const w = gameState.wanted;
      const duel = w?.duel;
      if (!w || !duel) throw new BadRequestException('진행 중인 수배 전투가 없어요.');
      const speciesList = await this.speciesService.findAll();
      const poster = getWantedPoster(w.day, speciesList.map((s) => s.speciesId));
      if (!poster) throw new BadRequestException('수배서를 찾을 수 없어요.');
      const tier = findWantedTier(w.tier);
      const mySpecies = speciesList.find((s) => s.speciesId === w.fighterSpeciesId);
      if (!tier || !mySpecies) throw new BadRequestException('수배 전투 정보를 읽지 못했어요.');
      if (wantedBannedActions(poster.conditions).includes(action as DuelAction)) {
        throw new BadRequestException(`${DUEL_ACTION_INFO.find((a) => a.id === action)?.name ?? action}은(는) 오늘의 수배 조건으로 쓸 수 없어요.`);
      }
      const state = this.toDuelState(duel);
      const status = getDuelActionStates(state).find((a) => a.id === action)!;
      if (!status.available) {
        const name = action === 'skill' ? '계열 기술' : DUEL_ACTION_INFO.find((a) => a.id === action)?.name ?? action;
        throw new BadRequestException(`${name}은(는) 지금 쓸 수 없어요. ${status.reason ?? ''}`.trim());
      }
      const mine: CombatStats = { hp: duel.mineHp, atk: duel.mineAtk, def: duel.mineDef };
      const bossStats: CombatStats = { hp: duel.enemyHpMax, atk: duel.enemyAtk, def: duel.enemyDef };
      const patterns = (duel.enemyPatterns ?? []) as BossPattern[];
      const r = playDuelTurn(mine, bossStats, patterns, state, action as DuelAction, Math.random, {
        healCapHp: duel.mineHp,
        skill: this.gameState.duelSkillOf(mySpecies, gameState),
        strikeBonus: action === 'strike' && typeof rhythm === 'number' && Number.isFinite(rhythm) ? rhythmStrikeBonus(rhythm) : undefined,
      });
      const log = [...(duel.log as unknown as BattleTurn[]), ...r.turns];
      if (!r.winner) {
        duel.turn = r.state.turn;
        duel.myHp = r.state.myHp;
        duel.enemyHp = r.state.bossHp;
        duel.enraged = r.state.enraged;
        duel.charged = r.state.charged;
        duel.strikeCooldown = r.state.strikeCooldown;
        duel.healUsed = r.state.healUsed;
        duel.skillCooldown = r.state.skillCooldown ?? 0;
        duel.burnTurns = r.state.burnTurns ?? 0;
        duel.rootTurns = r.state.rootTurns ?? 0;
        duel.log = log as unknown as Record<string, unknown>[];
        await gameState.save();
        return { gameState, message: '', step: true as const, turns: r.turns, status: this.buildStatus(gameState, w, poster, speciesList), result: null };
      }
      return this.finish(gameState, w, poster, speciesList, tier, r.winner === 'me', log, r.turns);
    });
  }

  async forfeit(userId: string) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      const w = gameState.wanted;
      if (!w?.duel) throw new BadRequestException('진행 중인 수배 전투가 없어요.');
      const speciesList = await this.speciesService.findAll();
      const poster = getWantedPoster(w.day, speciesList.map((s) => s.speciesId));
      const tier = findWantedTier(w.tier);
      if (!poster || !tier) {
        w.duel = null;
        await gameState.save();
        return { gameState, message: '수배 전투를 포기했어요.', step: false as const, turns: [] as BattleTurn[], status: null, result: { won: false, tier: w.tier, gold: 0, diamonds: 0, milestoneDiamonds: 0, newPoster: false } };
      }
      return this.finish(gameState, w, poster, speciesList, tier, false, (w.duel.log as unknown as BattleTurn[]) ?? [], [], true);
    });
  }

  // 전투가 끝났다: 이겼으면 현상금과 수배서 도감 등록, 졌으면(포기 포함) 도전 한 번만 쓴 것이 된다.
  private async finish(
    gameState: GameStateDocument,
    w: WantedState,
    poster: WantedPoster,
    speciesList: Species[],
    tier: WantedTier,
    won: boolean,
    log: BattleTurn[],
    turns: BattleTurn[],
    forfeited = false,
  ) {
    w.duel = null;
    let gold = 0;
    let diamonds = 0;
    let milestoneDiamonds = 0;
    let newPoster = false;
    let message: string;
    if (won) {
      const already = (w.clearedTiers ?? []).includes(tier.id);
      if (!already) {
        w.clearedTiers = [...(w.clearedTiers ?? []), tier.id];
        gold = tier.gold;
        diamonds = tier.diamonds;
        gameState.coins += gold;
        gameState.stats.earned += gold;
        gameState.diamonds += diamonds;
      }
      // 수배서 도감: 그날 장이 없으면 새로 붙이고, 있으면 더 높은 등급으로 올린다
      const posters = [...(w.posters ?? [])];
      const idx = posters.findIndex((p) => p.day === poster.day);
      if (idx < 0) {
        posters.push({ day: poster.day, speciesId: poster.bossSpeciesId, tier: tier.id } as WantedPosterRecord);
        newPoster = true;
      } else if (TIER_ORDER.indexOf(tier.id) > TIER_ORDER.indexOf(posters[idx].tier)) {
        posters[idx] = { ...posters[idx], tier: tier.id } as WantedPosterRecord;
      }
      posters.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
      w.posters = posters.slice(-WANTED_MAX_POSTERS);
      const claimed = new Set(w.claimedMilestones ?? []);
      for (const m of WANTED_MILESTONES) {
        if (w.posters.length >= m.count && !claimed.has(m.count)) {
          claimed.add(m.count);
          milestoneDiamonds += m.diamonds;
        }
      }
      if (milestoneDiamonds > 0) {
        w.claimedMilestones = [...claimed];
        gameState.diamonds += milestoneDiamonds;
      }
      message = `${tier.icon} ${tier.name}등급 수배 보스를 잡았어요!${already ? ' (오늘 이미 받은 등급이라 현상금은 없어요)' : ` 현상금 ${gold.toLocaleString('ko-KR')} G · 💎 ${diamonds}개`}${milestoneDiamonds > 0 ? ` · 도감 보상 💎 ${milestoneDiamonds}개` : ''}`;
      this.gameState.pushLog(gameState, 'trophy', message);
      if (tier.id === 'gold' && !already) void this.gameState.recordForestEvent('wanted', gameState.userId.toString(), { tier: tier.id, bossSpeciesId: poster.bossSpeciesId });
    } else {
      message = forfeited ? '수배 전투를 포기했어요.' : '수배 보스에게 쓰러졌어요…';
    }
    await gameState.save();
    return {
      gameState,
      message,
      step: false as const,
      turns,
      battleLog: log,
      status: this.buildStatus(gameState, w, poster, speciesList),
      result: { won, tier: tier.id, gold, diamonds, milestoneDiamonds, newPoster },
    };
  }
}
