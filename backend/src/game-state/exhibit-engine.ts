// ---- 표본 전시관 ----
// 가진 종의 표본을 골드로 만들어 전시관에 진열한다. 표본은 동 → 은 → 금 → 화석 순으로 골드를 더 써서 등급을 올린다.
// 진열한 표본은 방문자가 볼 수 있고(사육장 방문 화면), 전시 점수로 순위를 매긴다. 신화 종의 금·화석 표본은 자랑거리다.
// 선반(진열 칸)은 기본 6칸이고 골드로 2칸씩 최대 7번 늘린다.

export const EXHIBIT_TIERS = [
  { id: 'bronze', name: '동표본', icon: '🥉', multiplier: 1, points: 1 },
  { id: 'silver', name: '은표본', icon: '🥈', multiplier: 4, points: 3 },
  { id: 'gold', name: '금표본', icon: '🥇', multiplier: 16, points: 8 },
  { id: 'fossil', name: '화석 표본', icon: '🦴', multiplier: 64, points: 20 },
] as const;
export const EXHIBIT_MAX_TIER = EXHIBIT_TIERS.length;

// 종 희귀도(일반~신화)마다 동표본의 골드 값. 등급 값 = 이 값 × 등급 배율(1·4·16·64).
export const EXHIBIT_BASE_PRICE: readonly number[] = [2_000, 10_000, 50_000, 250_000, 1_500_000];

export const EXHIBIT_BASE_SLOTS = 6;
export const EXHIBIT_SLOTS_PER_SHELF = 2;
export const EXHIBIT_MAX_SHELF_LEVEL = 7;
export const EXHIBIT_SHELF_BASE_PRICE = 150_000; // 선반을 level → level+1로 늘리는 값 = 이 값 × 2^level

export const EXHIBIT_LIKE_ID = 'exhibition'; // 사육장 좋아요(terrarium_likes)에서 전시관을 가리키는 id

const clampRarity = (rarity: number) => Math.max(0, Math.min(4, Math.floor(rarity) || 0));

// 그 종의 표본을 tier(1~4) 등급으로 만드는 데 드는 골드. 이미 낮은 등급이 있으면 다음 등급 값만 든다(낸 값은 돌려받지 않는다).
export function specimenPrice(rarity: number, tier: number): number {
  const t = Math.max(1, Math.min(EXHIBIT_MAX_TIER, Math.floor(tier) || 1));
  return EXHIBIT_BASE_PRICE[clampRarity(rarity)] * EXHIBIT_TIERS[t - 1].multiplier;
}

export function shelfSlots(shelfLevel: number): number {
  return EXHIBIT_BASE_SLOTS + EXHIBIT_SLOTS_PER_SHELF * Math.max(0, Math.min(EXHIBIT_MAX_SHELF_LEVEL, Math.floor(shelfLevel) || 0));
}

// 선반을 한 단계 늘리는 값. 최고 단계면 null.
export function shelfPrice(shelfLevel: number): number | null {
  const level = Math.max(0, Math.floor(shelfLevel) || 0);
  return level >= EXHIBIT_MAX_SHELF_LEVEL ? null : EXHIBIT_SHELF_BASE_PRICE * Math.pow(2, level);
}

// 표본 하나의 전시 점수 = 등급 점수 × (1 + 종 희귀도)
export function specimenScore(rarity: number, tier: number): number {
  const t = Math.max(0, Math.min(EXHIBIT_MAX_TIER, Math.floor(tier) || 0));
  return t === 0 ? 0 : EXHIBIT_TIERS[t - 1].points * (1 + clampRarity(rarity));
}

// 진열 중인 표본들의 전시 점수 합. rarityOf로 종 희귀도를 찾고, 없는 종·표본은 건너뛴다.
export function exhibitScore(shown: readonly string[], specimens: ReadonlyMap<string, number> | Record<string, number> | null | undefined, rarityOf: (speciesId: string) => number | undefined): number {
  let sum = 0;
  for (const id of new Set(shown)) {
    const tier = specimens instanceof Map ? specimens.get(id) : (specimens as Record<string, number> | null | undefined)?.[id];
    const rarity = rarityOf(id);
    if (!tier || rarity === undefined) continue;
    sum += specimenScore(rarity, tier);
  }
  return sum;
}
