import type { Species } from '../api/types';

export const BASE_CAPACITY = 20;
export const CAPACITY_PER_LEVEL = 20;
export const SOIL_RATE_BONUS_PER_LEVEL = 0.25;
export const NURSERY_TIME_REDUCTION_PER_LEVEL = 0.12;
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

export function getBreedInterval(baseBreedSeconds: number, nurseryLevel: number): number {
  return baseBreedSeconds * (1 - nurseryLevel * NURSERY_TIME_REDUCTION_PER_LEVEL);
}

export function upgradeCost(baseCost: number, factor: number, currentLevel: number): number {
  return Math.round(baseCost * Math.pow(factor, currentLevel));
}

export function formatNumber(n: number): string {
  return Math.floor(n).toLocaleString('ko-KR');
}
