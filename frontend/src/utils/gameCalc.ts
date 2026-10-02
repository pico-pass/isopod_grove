import type {
  Achievement,
  CombatStats,
  EquipmentCatalogItem,
  EquipmentItemState,
  GameState,
  Species,
} from '../api/types';

export const BASE_CAPACITY = 20;
export const CAPACITY_PER_LEVEL = 20;
export const SOIL_RATE_BONUS_PER_LEVEL = 0.25;
export const NURSERY_TIME_REDUCTION_PER_LEVEL = 0.12;
// 희귀도(일반~신화)별 번식 주기(초): 5분 / 20분 / 60분 / 4시간 / 10시간마다 +1마리
export const BREED_SECONDS_BY_RARITY = [300, 1200, 3600, 14400, 36000];
export const MAX_TERRARIUMS = 10;
export const TERRARIUM_BASE_COST = 2500;
export const TERRARIUM_COST_FACTOR = 2.5;
export const LEVEL_XP_BASE = 100; // 1레벨 → 2레벨에 필요한 경험치
export const LEVEL_XP_GROWTH = 1.15; // 레벨이 오를 때마다 필요 경험치가 1.15배씩 늘어난다
export const EXPLORE_COST = 777;
// 숲 탐색권: 골드 대신 1장으로 무료 탐색을 할 수 있는 아이템.
export const EXPLORE_TICKET_PRICE = 500; // 마켓에서 구매할 때 가격(G/장)
export const MAX_FREE_EXPLORE_TICKETS = 5; // 하루 무료 충전이 채워주는 최대 보유 개수(구매/보상으로는 더 가질 수 있음)
// 다이아: 업적/새 종 발견/레벨업으로 얻는다.
export const NICKNAME_CHANGE_COST = 200;
// 야생 배틀 난이도(=상대 희귀도)별 보상/확률. 백엔드(game-engine.ts)와 같은 값이어야 한다.
export const BATTLE_REWARD_BY_RARITY = [10, 25, 70, 180, 450];
export const BATTLE_DIAMOND_CHANCE_BY_RARITY = [0.04, 0.06, 0.08, 0.1, 0.14];
export const BATTLE_LEVEL_XP_BASE = 20;
export const BATTLE_LEVEL_XP_GROWTH = 1.25;
// 전투 훈련 비용/경험치. 백엔드(game-engine.ts)와 같은 값이어야 한다.
export const TRAIN_BASE_COST_BY_RARITY = [15, 40, 120, 400, 1200];
export const TRAIN_COST_LEVEL_GROWTH = 1.12;
export const TRAIN_XP_BY_INTENSITY = [8, 18, 36];
export const TRAIN_COST_MULT_BY_INTENSITY = [1, 2.2, 4.5];
export const TRAIN_INTENSITY_LABELS = ['가벼운 훈련', '보통 훈련', '강도 높은 훈련'];
export const TRAIN_EXTREME_DIAMOND_COST = 1;
export const TRAIN_EXTREME_XP_MULTIPLIER = 12;
// 강도별 훈련 쿨다운(초). 백엔드(game-engine.ts)와 같은 값이어야 한다.
export const TRAIN_COOLDOWN_SECONDS_BY_INTENSITY = [30, 120, 480];
// 투기장(PvP). 백엔드(game-engine.ts)와 같은 값이어야 한다.
export const PVP_RATING_WIN_DELTA = 18;
export const PVP_RATING_LOSE_DELTA = 12;
export const PVP_WIN_COIN_REWARD = 120;
export const PVP_WIN_DIAMOND_CHANCE = 0.08;
// 종(콩벌레) 별명. 백엔드(game-engine.ts)와 같은 값이어야 한다.
export const SPECIES_NICKNAME_MAX_LENGTH = 10;

// 내가 지정한 별명을 종 이름에 덮어씌운 배열을 돌려준다(나에게만 보이는 표시용).
// 원본 species 배열은 건드리지 않는다.
export function applySpeciesNicknames(species: Species[], gameState: GameState): Species[] {
  const nicknames = gameState.speciesNicknames;
  if (!nicknames || Object.keys(nicknames).length === 0) return species;
  return species.map((sp) => (nicknames[sp.speciesId] ? { ...sp, name: nicknames[sp.speciesId] } : sp));
}

export const RARITIES = [
  { name: '일반', color: '#b7ce9a', odds: 65 },
  { name: '희귀', color: '#90c9de', odds: 20 },
  { name: '에픽', color: '#c5a7e5', odds: 10 },
  { name: '전설', color: '#e6c37e', odds: 3.5 },
  { name: '신화', color: '#aadfc0', odds: 1.5 },
];

export interface LevelProgress {
  level: number;
  currentXp: number; // 현재 레벨 구간에서 쌓은 경험치
  requiredXp: number; // 다음 레벨까지 필요한 경험치
}

// 누적 경험치를 "레벨 1부터 base, 레벨마다 growth배씩 늘어나는 요구치"로 환산한다.
// 계정 레벨과 종별 전투 레벨이 같은 방식을 쓴다. 백엔드(game-engine.ts)에도 같은 함수가 있다.
function computeLevelProgress(xp: number, base: number, growth: number): LevelProgress {
  let level = 1;
  let remaining = xp;
  let required = Math.round(base * Math.pow(growth, level - 1));
  while (remaining >= required) {
    remaining -= required;
    level++;
    required = Math.round(base * Math.pow(growth, level - 1));
  }
  return { level, currentXp: remaining, requiredXp: required };
}

// level(그 레벨에서 다음 레벨까지) 구간에 필요한 경험치
export function getLevelXpRequirement(level: number): number {
  return Math.round(LEVEL_XP_BASE * Math.pow(LEVEL_XP_GROWTH, level - 1));
}

export function getLevelProgress(xp: number): LevelProgress {
  return computeLevelProgress(xp, LEVEL_XP_BASE, LEVEL_XP_GROWTH);
}

export function getLevel(xp: number): number {
  return getLevelProgress(xp).level;
}

export function getBattleLevelProgress(xp: number): LevelProgress {
  return computeLevelProgress(xp, BATTLE_LEVEL_XP_BASE, BATTLE_LEVEL_XP_GROWTH);
}

export function getBattleLevel(xp: number): number {
  return getBattleLevelProgress(xp).level;
}

// 훈련 1회 비용(코인) 미리보기. 백엔드(game-engine.ts)에도 같은 함수가 있다.
export function getTrainCost(rarity: number, level: number, intensity: number): number {
  const base = TRAIN_BASE_COST_BY_RARITY[rarity] ?? TRAIN_BASE_COST_BY_RARITY[0];
  const mult = TRAIN_COST_MULT_BY_INTENSITY[intensity] ?? 1;
  return Math.round(base * Math.pow(TRAIN_COST_LEVEL_GROWTH, level - 1) * mult);
}

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

// 야생 배틀 예상 스탯(미리보기용). 실제 전투에선 ±15% 개체 편차가 추가로 붙는다.
// 백엔드(game-engine.ts)에도 같은 함수가 있다. 값을 바꿀 땐 두 곳을 함께 고쳐야 한다.
export const BATTLE_LEVEL_STAT_BONUS = 0.08; // 전투 레벨 1당 기본 스탯 +8%

export function getCombatBaseStats(rarity: number, level = 1): CombatStats {
  const base = {
    hp: 50 + rarity * 40,
    atk: 10 + rarity * 8,
    def: 5 + rarity * 4,
  };
  const levelMultiplier = 1 + (level - 1) * BATTLE_LEVEL_STAT_BONUS;
  return {
    hp: Math.round(base.hp * levelMultiplier),
    atk: Math.round(base.atk * levelMultiplier),
    def: Math.round(base.def * levelMultiplier),
  };
}

// ---- 장비 ----
// 백엔드(game-engine.ts)와 같은 값·같은 공식이어야 한다. 값을 바꿀 땐 두 곳을 함께 고쳐야 한다.
export const EQUIPMENT_PULL_COST = 40;
export const EQUIPMENT_PULL10_COST = 360;
export const EQUIPMENT_PULL_ODDS = [55, 28, 12, 4, 1];
export const EQUIPMENT_PITY_LIMIT = 50;
export const EQUIPMENT_BASE_BONUS_BY_RARITY = [0.02, 0.03, 0.05, 0.07, 0.1];
export const EQUIPMENT_LEVEL_BONUS = 0.15;
export const EQUIPMENT_AWAKEN_BONUS = 0.05;
export const EQUIPMENT_AWAKEN_LEVEL_GAIN = 3;
export const EQUIPMENT_MAX_AWAKENINGS = 5;
export const EQUIPMENT_AWAKEN_BASE_SUCCESS = 0.7;
export const EQUIPMENT_AWAKEN_FAIL_BONUS = 0.05;
export const EQUIPMENT_AWAKEN_GOLD_BASE_BY_RARITY = [3000, 8000, 20000, 50000, 120000];
export const EQUIPMENT_BASE_SLOTS = 3;
export const EQUIPMENT_MAX_SLOTS = 5;
export const EQUIPMENT_SLOT_EXPAND_COSTS = [500, 1250];
export const PVP_EQUIPMENT_EFFECT_RATE = 1;

export interface StatBonuses {
  hp: number;
  atk: number;
  def: number;
}
export const NO_BONUSES: StatBonuses = { hp: 0, atk: 0, def: 0 };

export const EQUIPMENT_CATEGORY_INFO = {
  weapon: { label: '무기', stat: 'atk', statLabel: '공격력', icon: '⚔️' },
  armor: { label: '방어구', stat: 'def', statLabel: '방어력', icon: '🛡️' },
  charm: { label: '장신구', stat: 'hp', statLabel: 'HP', icon: '❤️' },
} as const;

export function getEquipmentBonus(rarity: number, level: number, awakenCount: number): number {
  const multiplier = 1 + EQUIPMENT_LEVEL_BONUS * (level - 1) + EQUIPMENT_AWAKEN_BONUS * awakenCount;
  return (EQUIPMENT_BASE_BONUS_BY_RARITY[rarity] ?? 0) * multiplier;
}

// 장착한 슬롯들의 보너스를 스탯별로 합산한다. rate는 투기장 반영률 같은 배율이다.
export function computeEquipmentBonuses(
  slots: readonly string[] | undefined,
  items: readonly EquipmentItemState[] | undefined,
  catalog: readonly EquipmentCatalogItem[],
  rate = 1,
): StatBonuses {
  const result: StatBonuses = { hp: 0, atk: 0, def: 0 };
  const used = new Set<string>();
  for (const itemId of slots ?? []) {
    if (!itemId || used.has(itemId)) continue;
    used.add(itemId);
    const def = catalog.find((c) => c.equipmentId === itemId);
    const state = (items ?? []).find((i) => i.itemId === itemId);
    if (!def || !state) continue;
    result[EQUIPMENT_CATEGORY_INFO[def.category].stat] +=
      getEquipmentBonus(def.rarity, state.level, state.awakenCount) * rate;
  }
  return result;
}

export function hasBonuses(b: StatBonuses): boolean {
  return b.hp > 0 || b.atk > 0 || b.def > 0;
}

export function scaleBonuses(b: StatBonuses, rate: number): StatBonuses {
  return { hp: b.hp * rate, atk: b.atk * rate, def: b.def * rate };
}

// 미리보기용: 기본 스탯에 보너스를 곱해 반올림한다.
export function applyStatBonuses(stats: CombatStats, b: StatBonuses): CombatStats {
  return {
    hp: Math.round(stats.hp * (1 + b.hp)),
    atk: Math.round(stats.atk * (1 + b.atk)),
    def: Math.round(stats.def * (1 + b.def)),
  };
}

export function formatBonusPercent(value: number): string {
  const pct = value * 100;
  return `+${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

export function getEquipmentLevelUpCopies(level: number): number {
  return level;
}

export function getAwakenSuccessChance(failures: number): number {
  return Math.min(1, EQUIPMENT_AWAKEN_BASE_SUCCESS + EQUIPMENT_AWAKEN_FAIL_BONUS * failures);
}

export function getAwakenCost(rarity: number, awakenCount: number): number {
  const base = EQUIPMENT_AWAKEN_GOLD_BASE_BY_RARITY[rarity] ?? EQUIPMENT_AWAKEN_GOLD_BASE_BY_RARITY[0];
  return base * (awakenCount + 1);
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

// ---- 업적 진행도 계산 ----
// 백엔드(game-engine.ts)에 같은 함수가 있다. 값을 바꿀 땐 두 곳을 함께 고쳐야 한다.
export function getAchievementProgress(
  achievement: Achievement,
  gameState: GameState,
  speciesList: Species[],
  friendsCount = 0,
): { progress: number; target: number } {
  if (achievement.type === 'collectionAll') {
    return { progress: gameState.discovered.length, target: speciesList.length };
  }
  if (achievement.type === 'collectionRarity') {
    const ids = speciesList.filter((s) => s.rarity === achievement.rarity).map((s) => s.speciesId);
    const have = ids.filter((id) => gameState.discovered.includes(id)).length;
    return { progress: have, target: ids.length };
  }
  const target = achievement.target ?? 0;
  switch (achievement.statKey) {
    case 'discovered':
      return { progress: gameState.discovered.length, target };
    case 'terrariums':
      return { progress: gameState.terrariums.length, target };
    case 'friendsCount':
      return { progress: friendsCount, target };
    case 'nicknames':
      return { progress: Object.keys(gameState.speciesNicknames).length, target };
    case 'births':
    case 'sold':
    case 'explored':
    case 'earned':
    case 'battlesWon':
    case 'pvpWins':
    case 'peakPvpRating':
    case 'trainCount':
    case 'highestBattleLevel':
      return { progress: gameState.stats[achievement.statKey], target };
    default:
      return { progress: 0, target };
  }
}
