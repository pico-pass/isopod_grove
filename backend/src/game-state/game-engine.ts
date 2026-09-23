import { Species } from '../species/schemas/species.schema';

export const BASE_CAPACITY = 20;
export const CAPACITY_PER_LEVEL = 20;
export const SOIL_RATE_BONUS_PER_LEVEL = 0.25;
export const NURSERY_TIME_REDUCTION_PER_LEVEL = 0.12;
export const EXPLORE_COST = 180;
export const EXPLORE_YIELD = 2;
export const FEEDER_REFILL_THRESHOLD = 40;
export const FEEDER_REFILL_TARGET = 85;
export const MISTER_REFILL_THRESHOLD = 65;
export const MISTER_REFILL_TARGET = 78;
export const MAX_ADVANCE_SECONDS = 28800; // 8시간
export const STEP_SECONDS = 5;
export const CARE_COOLDOWN_MS = 10_000;
export const OBSERVE_COOLDOWN_MS = 3_000;
export const OBSERVE_REWARD = 2;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function getCapacity(spaceLevel: number): number {
  return BASE_CAPACITY + spaceLevel * CAPACITY_PER_LEVEL;
}

export function getPopulationCount(population: Map<string, number>): number {
  let total = 0;
  for (const n of population.values()) total += n;
  return total;
}

export function isComfortable(
  food: number,
  humidity: number,
  temperature: number,
): boolean {
  return (
    food >= 25 &&
    humidity >= 65 &&
    humidity <= 85 &&
    temperature >= 20 &&
    temperature <= 26
  );
}

export function canBreedInEnvironment(
  food: number,
  humidity: number,
  temperature: number,
): boolean {
  return (
    food >= 15 &&
    humidity >= 50 &&
    humidity <= 92 &&
    temperature >= 18 &&
    temperature <= 28
  );
}

export function getAutoIncomeRate(
  population: Map<string, number>,
  speciesList: Species[],
  soilLevel: number,
  comfortable: boolean,
): number {
  const speciesById = new Map(speciesList.map((s) => [s.speciesId, s]));
  let base = 0;
  for (const [speciesId, count] of population.entries()) {
    const species = speciesById.get(speciesId);
    if (species) base += count * species.rate;
  }
  return (
    base * (1 + soilLevel * SOIL_RATE_BONUS_PER_LEVEL) * (comfortable ? 1 : 0.4)
  );
}

export function getBreedInterval(
  baseBreedSeconds: number,
  nurseryLevel: number,
): number {
  return (
    baseBreedSeconds * (1 - nurseryLevel * NURSERY_TIME_REDUCTION_PER_LEVEL)
  );
}

export function rollRarity(
  random: number,
  rarities: { odds: number }[],
): number {
  const r = random * 100;
  let acc = 0;
  for (let i = 0; i < rarities.length; i++) {
    acc += rarities[i].odds;
    if (r < acc) return i;
  }
  return rarities.length - 1;
}

export function pickRandomOfRarity(
  speciesList: Species[],
  rarity: number,
  random: number,
): Species {
  const pool = speciesList.filter((s) => s.rarity === rarity);
  const index = Math.min(pool.length - 1, Math.floor(random * pool.length));
  return pool[index];
}
