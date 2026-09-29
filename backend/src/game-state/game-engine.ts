import { Species } from '../species/schemas/species.schema';

export const BASE_CAPACITY = 20;
export const CAPACITY_PER_LEVEL = 20;
export const SOIL_RATE_BONUS_PER_LEVEL = 0.25;
export const NURSERY_TIME_REDUCTION_PER_LEVEL = 0.12;
// 희귀도(일반~신화)별 번식 주기(초): 5분 / 20분 / 60분 / 4시간 / 10시간마다 +1마리
export const BREED_SECONDS_BY_RARITY = [300, 1200, 3600, 14400, 36000];
export const MAX_TERRARIUMS = 10;
export const TERRARIUM_BASE_COST = 2500;
export const TERRARIUM_COST_FACTOR = 2.5;
export const EXPLORE_COST = 777;
// 숲 탐색권: 골드 대신 1장으로 무료 탐색을 할 수 있는 아이템.
export const EXPLORE_TICKET_PRICE = 500; // 마켓에서 구매할 때 가격(G/장)
export const MAX_FREE_EXPLORE_TICKETS = 5; // 하루 무료 충전이 채워주는 최대 보유 개수(구매/보상으로는 더 가질 수 있음)
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
// 다이아: 업적/새 종 발견/레벨업으로 얻는다.
export const DIAMONDS_PER_LEVEL = 3; // 레벨이 1 오를 때마다 지급
// 새 종을 처음 발견했을 때 지급하는 다이아(희귀도 0~4: 일반~신화)
export const NEW_SPECIES_DIAMONDS_BY_RARITY = [1, 2, 4, 8, 15];
export const NICKNAME_CHANGE_COST = 2000;
export const LEVEL_XP_BASE = 100; // 1레벨 → 2레벨에 필요한 경험치
export const LEVEL_XP_GROWTH = 1.15; // 레벨이 오를 때마다 필요 경험치가 1.15배씩 늘어난다

// level(그 레벨에서 다음 레벨까지) 구간에 필요한 경험치
export function getLevelXpRequirement(level: number): number {
  return Math.round(LEVEL_XP_BASE * Math.pow(LEVEL_XP_GROWTH, level - 1));
}

export interface LevelProgress {
  level: number;
  currentXp: number; // 현재 레벨 구간에서 쌓은 경험치
  requiredXp: number; // 다음 레벨까지 필요한 경험치
}

export function getLevelProgress(xp: number): LevelProgress {
  let level = 1;
  let remaining = xp;
  let required = getLevelXpRequirement(level);
  while (remaining >= required) {
    remaining -= required;
    level++;
    required = getLevelXpRequirement(level);
  }
  return { level, currentXp: remaining, requiredXp: required };
}

export function getLevel(xp: number): number {
  return getLevelProgress(xp).level;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function getCapacity(spaceLevel: number): number {
  return BASE_CAPACITY + spaceLevel * CAPACITY_PER_LEVEL;
}

// 사육장을 하나 더 추가하는 비용. ownedCount는 현재 보유한 사육장 수(2번째 = 2,500 G, 이후 2.5배씩).
export function getTerrariumCost(ownedCount: number): number {
  return Math.round(
    TERRARIUM_BASE_COST * Math.pow(TERRARIUM_COST_FACTOR, ownedCount - 1),
  );
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

export function getBaseBreedSeconds(rarity: number): number {
  return BREED_SECONDS_BY_RARITY[rarity] ?? BREED_SECONDS_BY_RARITY[0];
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

// ---- 업적 진행도 계산 ----
// 프론트(gameCalc.ts)에도 같은 함수가 있다. 값을 바꿀 땐 두 곳을 함께 고쳐야 한다.
export interface AchievementProgressInput {
  type: 'stat' | 'collectionRarity' | 'collectionAll';
  statKey?: 'births' | 'sold' | 'explored' | 'earned' | 'discovered' | 'terrariums';
  target?: number;
  rarity?: number;
}

export interface AchievementSubject {
  discovered: string[];
  terrariumCount: number;
  stats: { births: number; sold: number; explored: number; earned: number };
}

export function getAchievementProgress(
  achievement: AchievementProgressInput,
  subject: AchievementSubject,
  speciesList: { speciesId: string; rarity: number }[],
): { progress: number; target: number } {
  if (achievement.type === 'collectionAll') {
    return { progress: subject.discovered.length, target: speciesList.length };
  }
  if (achievement.type === 'collectionRarity') {
    const ids = speciesList
      .filter((s) => s.rarity === achievement.rarity)
      .map((s) => s.speciesId);
    const have = ids.filter((id) => subject.discovered.includes(id)).length;
    return { progress: have, target: ids.length };
  }
  const target = achievement.target ?? 0;
  switch (achievement.statKey) {
    case 'discovered':
      return { progress: subject.discovered.length, target };
    case 'terrariums':
      return { progress: subject.terrariumCount, target };
    case 'births':
    case 'sold':
    case 'explored':
    case 'earned':
      return { progress: subject.stats[achievement.statKey], target };
    default:
      return { progress: 0, target };
  }
}
