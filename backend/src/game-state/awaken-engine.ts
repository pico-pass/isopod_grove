import type { StatBonuses } from './game-engine';

// ---- 전투 레벨 각성 ★ ----
// 전투 레벨이 각성 가능 레벨(AWAKEN_REQUIRED_LEVEL)에 오른 식구를 골드와 다이아로 각성하면 전투 레벨(경험치)이 1로 돌아가는 대신 영구 ★가 1개 붙고,
// ★마다 전투 능력치(HP·공격력·방어력)가 AWAKEN_STAR_BONUS씩 오른다(장비 보너스와는 곱해진다). ★마다 비용이 3배씩 커지고 최대 AWAKEN_MAX_STARS개까지다.
// 종을 합치지 않고 제자리에서 강해지는 방식이다(종 승급 합성과 무관). 각성한 식구는 낮은 레벨에서 다시 올라와야 하고, 레벨을 다시 채우는 것이 장기 목표다.
// ★ 보너스는 야생 배틀·보스 타워·서바이벌·던전, 그리고 장비를 쓸 수 있고 레벨 제한이 없는 현상수배에 적용된다. 장비 영향을 줄인 투기장과 레벨만으로 겨루는 하극상 대회에는 적용되지 않는다.

export const AWAKEN_REQUIRED_LEVEL = 25;
export const AWAKEN_MAX_STARS = 5;
export const AWAKEN_STAR_BONUS = 0.2;
// 종 희귀도(일반~신화)별 ★1 골드 값. ★n은 × 3^(n−1).
export const AWAKEN_GOLD_BASE: readonly number[] = [1_000_000, 2_000_000, 4_000_000, 8_000_000, 16_000_000];
export const AWAKEN_GOLD_GROWTH = 3;
// 종 희귀도별 ★1 다이아 값. ★n은 × n.
export const AWAKEN_DIAMONDS_BASE: readonly number[] = [20, 40, 80, 150, 300];

const clampRarity = (rarity: number) => Math.max(0, Math.min(4, Math.floor(rarity) || 0));

// 그 종을 star번째 ★로 각성하는 데 드는 값(1~AWAKEN_MAX_STARS)
export function awakenCost(rarity: number, star: number): { gold: number; diamonds: number } {
  const s = Math.max(1, Math.min(AWAKEN_MAX_STARS, Math.floor(star) || 1));
  const r = clampRarity(rarity);
  return { gold: AWAKEN_GOLD_BASE[r] * Math.pow(AWAKEN_GOLD_GROWTH, s - 1), diamonds: AWAKEN_DIAMONDS_BASE[r] * s };
}

export function normalizeStars(value: number | null | undefined): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(AWAKEN_MAX_STARS, n)) : 0;
}

// ★ 개수만큼의 능력치 보너스(HP·공격력·방어력 같은 비율)
export function starBonuses(stars: number | null | undefined): StatBonuses {
  const b = normalizeStars(stars) * AWAKEN_STAR_BONUS;
  return { hp: b, atk: b, def: b };
}

// 장비 보너스와 ★ 보너스를 곱해서 하나의 보너스로 합친다: (1+a)(1+b) − 1
export function combineBonuses(a: StatBonuses, b: StatBonuses): StatBonuses {
  const mul = (x: number, y: number) => Math.round(((1 + x) * (1 + y) - 1) * 1e9) / 1e9; // 소수점 잡음(0.30000000000000004)을 없앤다
  return { hp: mul(a.hp, b.hp), atk: mul(a.atk, b.atk), def: mul(a.def, b.def) };
}
