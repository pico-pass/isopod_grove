import type { GameState, Species } from '../api/types';

export const BASE_CAPACITY = 20;
export const CAPACITY_PER_LEVEL = 20;
export const SOIL_RATE_BONUS_PER_LEVEL = 0.25;
export const NURSERY_TIME_REDUCTION_PER_LEVEL = 0.12;
// 희귀도(일반~신화)별 번식 주기(초): 5분 / 20분 / 60분 / 4시간 / 10시간마다 +1마리
export const BREED_SECONDS_BY_RARITY = [300, 1200, 3600, 14400, 36000];
export const MAX_TERRARIUMS = 10;
export const TERRARIUM_BASE_COST = 2500;
export const TERRARIUM_COST_FACTOR = 2.5;
export const EXPLORE_COST = 180;

export const RARITIES = [
  { name: '일반', color: '#b7ce9a', odds: 65 },
  { name: '희귀', color: '#90c9de', odds: 20 },
  { name: '에픽', color: '#c5a7e5', odds: 10 },
  { name: '전설', color: '#e6c37e', odds: 3.5 },
  { name: '신화', color: '#aadfc0', odds: 1.5 },
];

export function getCapacity(spaceLevel: number): number {
  return BASE_CAPACITY + spaceLevel * CAPACITY_PER_LEVEL;
}

// 사육장을 하나 더 추가하는 비용. ownedCount는 현재 보유한 사육장 수(2번째 = 2,500 G, 이후 2.5배씩).
export function getTerrariumCost(ownedCount: number): number {
  return Math.round(TERRARIUM_BASE_COST * Math.pow(TERRARIUM_COST_FACTOR, ownedCount - 1));
}

// 모든 사육장을 합친 종별 마릿수
export function getTotalPopulationBySpecies(gameState: GameState): Record<string, number> {
  const total: Record<string, number> = {};
  for (const t of gameState.terrariums) {
    for (const [id, n] of Object.entries(t.population)) {
      total[id] = (total[id] || 0) + n;
    }
  }
  return total;
}

export function getPopulationCount(population: Record<string, number>): number {
  return Object.values(population).reduce((sum, n) => sum + n, 0);
}

export function isComfortable(food: number, humidity: number, temperature: number): boolean {
  return food >= 25 && humidity >= 65 && humidity <= 85 && temperature >= 20 && temperature <= 26;
}

export function canBreedInEnvironment(
  food: number,
  humidity: number,
  temperature: number,
): boolean {
  return food >= 15 && humidity >= 50 && humidity <= 92 && temperature >= 18 && temperature <= 28;
}

export function getAutoIncomeRate(
  population: Record<string, number>,
  speciesList: Species[],
  soilLevel: number,
  comfortable: boolean,
): number {
  const speciesById = new Map(speciesList.map((s) => [s.speciesId, s]));
  let base = 0;
  for (const [speciesId, count] of Object.entries(population)) {
    const s = speciesById.get(speciesId);
    if (s) base += count * s.rate;
  }
  return base * (1 + soilLevel * SOIL_RATE_BONUS_PER_LEVEL) * (comfortable ? 1 : 0.4);
}

export function getBaseBreedSeconds(rarity: number): number {
  return BREED_SECONDS_BY_RARITY[rarity] ?? BREED_SECONDS_BY_RARITY[0];
}

export function getBreedInterval(baseBreedSeconds: number, nurseryLevel: number): number {
  return baseBreedSeconds * (1 - nurseryLevel * NURSERY_TIME_REDUCTION_PER_LEVEL);
}

export function upgradeCost(baseCost: number, factor: number, currentLevel: number): number {
  return Math.round(baseCost * Math.pow(factor, currentLevel));
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  if (m > 0) return s > 0 ? `${m}분 ${s}초` : `${m}분`;
  return `${s}초`;
}

export function formatNumber(n: number): string {
  return Math.floor(n).toLocaleString('ko-KR');
}
