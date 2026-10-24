import type { SpeciesFamily } from '../species/species.family';
import type { SkillLabEffects } from './game-engine';

// ---- 계열 기술 연구소 ----
// 불꽃·숲·서리 계열마다 직접 전투의 계열 기술(불길·뿌리 감기·빙결)을 강하게 하는 연구 트리가 있다. 골드와 다이아로 레벨을 올리고,
// 단계마다 값이 기하급수로 오르며 상한이 있다. 연구는 그 계열 식구가 쓰는 계열 기술에만 적용되고 직접 전투(야생·보스·서바이벌·던전·현상수배)에서 효과가 난다.
export type SkillLabId = 'fire_burn' | 'fire_turns' | 'fire_cd' | 'forest_cut' | 'forest_turns' | 'forest_cd' | 'frost_hit' | 'frost_cd';

export interface SkillLabNode {
  id: SkillLabId;
  family: SpeciesFamily;
  name: string;
  icon: string;
  desc: string;
  max: number;
  gold: number; // 1레벨의 골드 값
  growth: number; // 레벨마다 곱해지는 값(1이면 일정)
  diamonds: number; // 1레벨의 다이아 값. 레벨 n은 이 값 × n
}

export const SKILL_LAB_BURN_PER_LEVEL = 0.1; // 화상 피해 +10%
export const SKILL_LAB_ROOT_PER_LEVEL = 0.02; // 속박 공격력 감소 +2%p
export const SKILL_LAB_FROST_HIT_PER_LEVEL = 0.04; // 빙결 공격 피해 +4%p

export const SKILL_LAB: readonly SkillLabNode[] = [
  { id: 'fire_burn', family: 'fire', name: '불씨 증폭', icon: '🔥', desc: `불길의 화상 피해가 레벨마다 +${SKILL_LAB_BURN_PER_LEVEL * 100}%.`, max: 5, gold: 400_000, growth: 1.8, diamonds: 2 },
  { id: 'fire_turns', family: 'fire', name: '오래 타는 불', icon: '🕯️', desc: '화상이 1턴 더 오래 타요.', max: 1, gold: 6_000_000, growth: 1, diamonds: 30 },
  { id: 'fire_cd', family: 'fire', name: '불꽃 가속', icon: '⏩', desc: '불길의 쉬는 시간이 1턴 줄어요.', max: 1, gold: 10_000_000, growth: 1, diamonds: 50 },
  { id: 'forest_cut', family: 'forest', name: '뿌리 강화', icon: '🌿', desc: `뿌리 감기로 줄어드는 상대 공격력이 레벨마다 +${SKILL_LAB_ROOT_PER_LEVEL * 100}%p.`, max: 5, gold: 400_000, growth: 1.8, diamonds: 2 },
  { id: 'forest_turns', family: 'forest', name: '질긴 뿌리', icon: '🪢', desc: '속박이 1턴 더 오래가요.', max: 1, gold: 6_000_000, growth: 1, diamonds: 30 },
  { id: 'forest_cd', family: 'forest', name: '뿌리 재생', icon: '⏩', desc: '뿌리 감기의 쉬는 시간이 1턴 줄어요.', max: 1, gold: 10_000_000, growth: 1, diamonds: 50 },
  { id: 'frost_hit', family: 'frost', name: '한기 응축', icon: '❄️', desc: `빙결의 공격 피해가 레벨마다 +${SKILL_LAB_FROST_HIT_PER_LEVEL * 100}%p.`, max: 5, gold: 400_000, growth: 1.8, diamonds: 2 },
  { id: 'frost_cd', family: 'frost', name: '서리 가속', icon: '⏩', desc: '빙결의 쉬는 시간이 레벨마다 1턴 줄어요.', max: 2, gold: 3_000_000, growth: 3, diamonds: 20 },
];

export const findSkillLab = (id: string): SkillLabNode | undefined => SKILL_LAB.find((n) => n.id === id);

// 그 연구를 level 레벨로 올리는 데 드는 값(1부터). 골드는 천 단위로 반올림한다.
export function skillLabCost(node: SkillLabNode, level: number): { gold: number; diamonds: number } {
  return { gold: Math.round((node.gold * Math.pow(node.growth, level - 1)) / 1000) * 1000, diamonds: node.diamonds * level };
}

// 연구 레벨(누락은 0)을 정리한다
export function normalizeSkillLab(raw: ReadonlyMap<string, number> | Record<string, number> | null | undefined): Record<SkillLabId, number> {
  const get = (id: string): number => {
    const v = raw instanceof Map ? raw.get(id) : (raw as Record<string, number> | null | undefined)?.[id];
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const out = {} as Record<SkillLabId, number>;
  for (const node of SKILL_LAB) out[node.id] = Math.max(0, Math.min(node.max, Math.floor(get(node.id))));
  return out;
}

// 그 계열의 연구 레벨이 계열 기술에 주는 효과(쉬는 시간 감소는 cooldownReduce로 따로 돌려준다)
export function skillLabEffects(family: SpeciesFamily, levels: Record<SkillLabId, number>): { lab: SkillLabEffects; cooldownReduce: number } {
  if (family === 'fire') return { lab: { burnMult: levels.fire_burn * SKILL_LAB_BURN_PER_LEVEL, burnTurns: levels.fire_turns }, cooldownReduce: levels.fire_cd };
  if (family === 'forest') return { lab: { rootCut: levels.forest_cut * SKILL_LAB_ROOT_PER_LEVEL, rootTurns: levels.forest_turns }, cooldownReduce: levels.forest_cd };
  return { lab: { hit: levels.frost_hit * SKILL_LAB_FROST_HIT_PER_LEVEL }, cooldownReduce: levels.frost_cd };
}
