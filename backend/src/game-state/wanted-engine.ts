import {
  BOSS_BASE_STATS,
  BOSS_STAT_MULTIPLIER,
  SURVIVAL_STAGE_GROWTH,
  rollWildEnvironment,
  type BattleEnvironmentId,
  type BossPattern,
  type CombatStats,
  type DuelAction,
} from './game-engine';
import { seededRandom } from './dungeon-engine';
import type { SpeciesFamily } from '../species/species.family';

// ---- 현상수배 보스 ----
// 매일(한국 날짜) 수배서가 한 장 붙는다: 오늘의 수배 보스(종·환경·패턴)와 출전 조건. 같은 날에는 모두에게 같다.
// 동·은·금 세 등급 중 골라 도전한다. 등급이 오를수록 보스가 세고 패턴이 늘며 현상금이 커진다.
// 보스의 능력치는 식구 힘과 상관없는 절대값(서바이벌 스테이지의 엘리트 공식)이라, 조건이 식구 힘을 깎으면 정말로 어려워진다.
export type WantedTierId = 'bronze' | 'silver' | 'gold';
export interface WantedTier {
  id: WantedTierId;
  name: string;
  icon: string;
  stage: number; // 보스 능력치 = 서바이벌 이 스테이지의 엘리트 능력치
  patternCount: number;
  gold: number;
  diamonds: number;
}
export const WANTED_TIERS: readonly WantedTier[] = [
  { id: 'bronze', name: '동', icon: '🥉', stage: 8, patternCount: 1, gold: 50_000, diamonds: 1 },
  { id: 'silver', name: '은', icon: '🥈', stage: 20, patternCount: 2, gold: 150_000, diamonds: 2 },
  { id: 'gold', name: '금', icon: '🥇', stage: 32, patternCount: 3, gold: 400_000, diamonds: 4 },
];
export const findWantedTier = (id: string): WantedTier | undefined => WANTED_TIERS.find((t) => t.id === id);
export const WANTED_DAILY_ATTEMPTS = 3; // 하루 도전(시작) 횟수. 이긴 등급은 그날 다시 보상받지 못한다.
export const WANTED_MAX_POSTERS = 400; // 수배서 도감에 남기는 최대 장 수

// 깬 수배서 장 수에 따른 도감 보상(처음 그 장 수에 닿을 때 한 번)
export const WANTED_MILESTONES: readonly { count: number; diamonds: number }[] = [
  { count: 3, diamonds: 2 },
  { count: 7, diamonds: 5 },
  { count: 14, diamonds: 8 },
  { count: 30, diamonds: 15 },
  { count: 60, diamonds: 30 },
  { count: 100, diamonds: 50 },
];

export type WantedBannedAction = 'heal' | 'strike' | 'skill';
export type WantedCondition =
  | { kind: 'family'; family: SpeciesFamily }
  | { kind: 'rarityMax'; rarity: number }
  | { kind: 'noEquipment' }
  | { kind: 'levelCap'; level: number }
  | { kind: 'ban'; action: WantedBannedAction };

const FAMILY_NAMES: Record<SpeciesFamily, string> = { fire: '불꽃', forest: '숲', frost: '서리' };
const RARITY_MAX_TEXT = ['일반 콩벌레만 출전해요', '희귀 이하만 출전해요', '에픽 이하만 출전해요'];
const BAN_TEXT: Record<WantedBannedAction, string> = {
  heal: '회복을 쓸 수 없어요',
  strike: '강력한 일격을 쓸 수 없어요',
  skill: '계열 기술을 쓸 수 없어요',
};

export function describeWantedCondition(c: WantedCondition): string {
  switch (c.kind) {
    case 'family':
      return `${FAMILY_NAMES[c.family]} 계열만 출전해요`;
    case 'rarityMax':
      return RARITY_MAX_TEXT[c.rarity] ?? '희귀도 제한이 있어요';
    case 'noEquipment':
      return '장비를 쓸 수 없어요';
    case 'levelCap':
      return `전투 레벨이 ${c.level}로 제한돼요`;
    case 'ban':
      return BAN_TEXT[c.action];
  }
}

// 날짜 문자열 → 난수 시드
export function hashDay(day: string): number {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619);
  return (h >>> 0) % 2_147_483_647;
}

const FAMILIES: readonly SpeciesFamily[] = ['fire', 'forest', 'frost'];
const PATTERN_POOL: readonly BossPattern[] = ['guard', 'regen', 'heavy', 'enrage', 'thorns'];

// 오늘의 출전 조건(1~2개, 종류가 겹치지 않는다)
export function wantedConditions(day: string): WantedCondition[] {
  const seed = hashDay(day);
  const r = seededRandom(seed, 1, 41);
  const pick = <T>(list: readonly T[]) => list[Math.min(list.length - 1, Math.floor(r() * list.length))];
  const candidates: WantedCondition[] = [
    { kind: 'family', family: pick(FAMILIES) },
    { kind: 'rarityMax', rarity: pick([0, 1, 2]) },
    { kind: 'noEquipment' },
    { kind: 'levelCap', level: pick([20, 30, 40]) },
    { kind: 'ban', action: pick<WantedBannedAction>(['heal', 'strike', 'skill']) },
  ];
  const count = r() < 0.7 ? 1 : 2;
  const out: WantedCondition[] = [];
  while (out.length < count && candidates.length > 0) {
    const [c] = candidates.splice(Math.min(candidates.length - 1, Math.floor(r() * candidates.length)), 1);
    out.push(c);
  }
  return out;
}

// 이 식구가 오늘 출전할 수 있는지: 안 되면 이유를, 되면 null을 돌려준다.
export function checkWantedFighter(
  conditions: readonly WantedCondition[],
  fighter: { rarity: number; family: SpeciesFamily },
): string | null {
  for (const c of conditions) {
    if (c.kind === 'family' && fighter.family !== c.family) return `오늘은 ${describeWantedCondition(c)}`;
    if (c.kind === 'rarityMax' && fighter.rarity > c.rarity) return `오늘은 ${describeWantedCondition(c)}`;
  }
  return null;
}

// 조건을 반영한 전투 레벨 / 장비 사용 여부 / 못 쓰는 행동
export function wantedEffectiveLevel(conditions: readonly WantedCondition[], level: number): number {
  let out = level;
  for (const c of conditions) if (c.kind === 'levelCap') out = Math.min(out, c.level);
  return out;
}
export const wantedUsesEquipment = (conditions: readonly WantedCondition[]): boolean => !conditions.some((c) => c.kind === 'noEquipment');
export function wantedBannedActions(conditions: readonly WantedCondition[]): DuelAction[] {
  return conditions.flatMap((c) => (c.kind === 'ban' ? [c.action] : []));
}

export function wantedBossStats(tier: WantedTier): CombatStats {
  const growth = Math.pow(SURVIVAL_STAGE_GROWTH, tier.stage - 1);
  const stat = (k: keyof CombatStats) => Math.max(1, Math.round(BOSS_BASE_STATS[k] * growth * BOSS_STAT_MULTIPLIER[k]));
  return { hp: stat('hp'), atk: stat('atk'), def: stat('def') };
}

export interface WantedPoster {
  day: string;
  bossSpeciesId: string;
  environment: BattleEnvironmentId;
  patternOrder: BossPattern[]; // 등급마다 앞에서부터 patternCount개를 쓴다
  conditions: WantedCondition[];
}

// 오늘의 수배서. 종 목록(id)은 정렬해서 쓰므로 같은 날·같은 종 목록이면 같은 수배서다.
export function getWantedPoster(day: string, speciesIds: readonly string[]): WantedPoster | null {
  const ids = [...speciesIds].sort();
  if (ids.length === 0) return null;
  const seed = hashDay(day);
  const r = seededRandom(seed, 2, 42);
  const bossSpeciesId = ids[Math.min(ids.length - 1, Math.floor(r() * ids.length))];
  const environment = rollWildEnvironment(r());
  const order = [...PATTERN_POOL];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { day, bossSpeciesId, environment, patternOrder: order, conditions: wantedConditions(day) };
}

export const wantedPatterns = (poster: WantedPoster, tier: WantedTier): BossPattern[] => poster.patternOrder.slice(0, tier.patternCount);
