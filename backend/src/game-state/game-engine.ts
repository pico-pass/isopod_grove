import { Species } from '../species/schemas/species.schema';
import { SPECIES_FAMILIES, resolveFamily, type SpeciesFamily } from '../species/species.family';
import {
  EQUIPMENT_BY_ID,
  EQUIPMENT_CATALOG,
  EquipmentCatalogItem,
  EquipmentCategory,
} from '../equipment/equipment.data';

export const BASE_CAPACITY = 20;
export const CAPACITY_PER_LEVEL = 20;
export const SOIL_RATE_BONUS_PER_LEVEL = 0.25;
export const NURSERY_TIME_REDUCTION_PER_LEVEL = 0.12;
// 희귀도(일반~신화)별 번식 주기(초): 37분 30초 / 2시간 30분 / 7시간 30분 / 30시간 / 75시간마다 +1마리
export const BREED_SECONDS_BY_RARITY = [2250, 9000, 27000, 108000, 270000];
export const MAX_TERRARIUMS = 10;
export const TERRARIUM_BASE_COST = 8750;
export const TERRARIUM_COST_FACTOR = 2.5;
// 숲 탐색(골드) 비용: 첫 탐색은 EXPLORE_COST_BASE, 탐색을 한 번 할 때마다 다음 비용이 EXPLORE_COST_STEP씩 올라간다.
// 계정에 쌓인 탐색 횟수(exploreCostSteps)로 세며 매일 초기화되지 않는다. 탐색권으로 탐색해도 횟수에 센다.
// (stats.explored는 업적용 누적 기록이라 쓰지 않는다 — 이미 많이 탐색한 유저의 비용이 처음부터 수만 G가 되어 버린다.)
// 프론트(gameCalc.ts)에도 같은 값·함수가 있다. 값을 바꿀 땐 두 곳을 함께 고쳐야 한다.
export const EXPLORE_COST_BASE = 500;
export const EXPLORE_COST_STEP = 25;
export const getExploreCost = (exploreCostSteps: number): number =>
  EXPLORE_COST_BASE + EXPLORE_COST_STEP * Math.max(0, exploreCostSteps);
// 탐색권은 골드로 살 수 없다. 하루 1장씩 무료로 채워지고(최대 MAX_FREE_EXPLORE_TICKETS장), 업적·일일 목표·우편 보상으로 얻는다.
export const MAX_FREE_EXPLORE_TICKETS = 5; // 하루 무료 충전이 채워주는 최대 보유 개수(보상으로는 더 가질 수 있음)
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
export const NICKNAME_CHANGE_COST = 200;
// 야생 배틀: 난이도(=상대 희귀도)를 직접 골라 뽑은 야생 개체와 맞붙는다.
export const BATTLE_COOLDOWN_MS = 8_000;
export const BATTLE_MAX_TURNS = 20;
export const BATTLE_STAT_VARIANCE = 0.15; // 같은 종이어도 개체마다 ±15% 편차
export const BATTLE_DAMAGE_VARIANCE = 0.15; // 한 턴 피해량의 ±15% 편차
// 난이도(일반~신화)별 승리 보상
export const BATTLE_REWARD_BY_RARITY = [10, 25, 70, 180, 450];
export const BATTLE_DIAMOND_CHANCE_BY_RARITY = [0.04, 0.06, 0.08, 0.1, 0.14];
// 난이도별 "내 종"이 받는 전투 경험치(승리 시). 패배해도 25%는 받는다(완전히 헛수고는 아니게).
export const BATTLE_SPECIES_XP_BY_RARITY = [8, 18, 40, 90, 200];
export const BATTLE_SPECIES_LOSE_XP_RATIO = 0.25;
// 난이도별 계정 경험치(승리 시). 패배 시엔 난이도와 무관하게 위로 경험치만 준다.
export const BATTLE_ACCOUNT_XP_BY_RARITY = [8, 16, 28, 45, 70];
export const BATTLE_LOSE_XP = 2; // 져도 주는 약간의 위로 계정 경험치
// 전투 레벨: 종마다 전투로 따로 레벨이 오르고, 레벨당 기본 스탯이 8%씩 늘어난다.
export const BATTLE_LEVEL_XP_BASE = 20;
export const BATTLE_LEVEL_XP_GROWTH = 1.25;
export const BATTLE_LEVEL_STAT_BONUS = 0.08;
// 전투 훈련: 상대 없이 코인을 내고 바로 전투 경험치를 산다. 승패가 없는 대신 확정적이다.
// 강도가 높을수록 쿨다운도 길어진다: 가벼운 30초 / 보통 2분 / 강도 높은 8분.
export const TRAIN_COOLDOWN_MS_BY_INTENSITY = [30_000, 120_000, 480_000];
export const TRAIN_BASE_COST_BY_RARITY = [15, 40, 120, 400, 1200];
export const TRAIN_COST_LEVEL_GROWTH = 1.12; // 전투 레벨이 오를수록 훈련 비용도 조금씩 비싸진다
// 훈련 강도 3단계(가벼운/보통/강도 높은). 강도가 높을수록 경험치는 많지만 코인 대비 효율은 떨어진다.
export const TRAIN_XP_BY_INTENSITY = [8, 18, 36];
export const TRAIN_COST_MULT_BY_INTENSITY = [1, 2.2, 4.5];
// 극한 훈련: 켜면 코인 비용은 그대로지만 다이아 1개를 추가로 쓰고, 경험치가 12배로 뛴다.
export const TRAIN_EXTREME_DIAMOND_COST = 4;
export const TRAIN_EXTREME_XP_MULTIPLIER = 12;
// ---- 유저 PvP(투기장) ----
// 비동기 매칭: 상대가 접속 중이 아니어도 상대가 직접 지정해 둔 "방어 식구" 스냅샷과 즉시 대결한다.
// 이겨도 상대의 자원·레이팅은 전혀 건드리지 않는다(레이팅은 공격자인 나만 변동).
export const PVP_COOLDOWN_MS = 10_000;
export const PVP_RATING_DEFAULT = 1000;
export const PVP_RATING_WIN_DELTA = 18;
export const PVP_RATING_LOSE_DELTA = 12;
// 이 범위(±) 안에서 순서대로 상대를 찾고, 마지막 값은 사실상 전체 범위다.
export const PVP_MATCH_RATING_BANDS = [150, 400, 1000, 100_000];
// 이긴 상대에게 다시 도전할 수 있게 되기까지의 시간. 같은 상대를 연달아 이겨 레이팅·보상을 쌓는 걸 막는다.
export const PVP_REMATCH_COOLDOWN_MS = 30 * 60_000;
export const PVP_REMATCH_KEY_PREFIX = 'pvpWin:'; // cooldowns 맵의 키 = 접두사 + 상대 userId
export const PVP_WIN_COIN_REWARD = 120;
export const PVP_WIN_DIAMOND_CHANCE = 0.08;
export const PVP_WIN_SPECIES_XP = 30;
export const PVP_WIN_ACCOUNT_XP = 20;
export const PVP_LOSE_ACCOUNT_XP = 3;
// 종(콩벌레) 별명: 나에게만 보이는 표시용 이름. 무료이며 언제든 바꾸거나 되돌릴 수 있다.
export const SPECIES_NICKNAME_MAX_LENGTH = 10;
// 사육장 이름: 나에게만 보이는 표시용 이름이다. 무료로 언제든 바꿀 수 있다.
export const TERRARIUM_NAME_MAX_LENGTH = 20;
// ---- 장비 ----
// 뽑기: 1회 40다이아, 10연차는 10% 할인(희귀 이상 1개 보장). 전설 이상이 50회 연속 안 나오면 50번째는 확정.
export const EQUIPMENT_PULL_COST = 40;
export const EQUIPMENT_PULL10_COST = 360;
export const EQUIPMENT_PULL_ODDS = [55, 28, 12, 4, 1]; // 희귀도 0~4(일반~신화), 합계 100
export const EQUIPMENT_PITY_LIMIT = 50;
// 슬롯 1칸이 올려주는 스탯 비율의 기본값(레벨 1, 각성 0). 아래 배율이 곱해진다.
export const EQUIPMENT_BASE_BONUS_BY_RARITY = [0.02, 0.03, 0.05, 0.07, 0.1];
export const EQUIPMENT_LEVEL_BONUS = 0.15; // 장비 레벨이 1 오를 때마다 기본값의 +15%
export const EQUIPMENT_AWAKEN_BONUS = 0.05; // 각성 1회마다 기본값의 +5%
export const EQUIPMENT_BASE_MAX_LEVEL = 5;
export const EQUIPMENT_AWAKEN_LEVEL_GAIN = 3; // 각성 성공 시 최대 레벨 +3
export const EQUIPMENT_MAX_AWAKENINGS = 5; // 무한정 세지지 않게 둔 상한
export const EQUIPMENT_AWAKEN_BASE_SUCCESS = 0.7;
export const EQUIPMENT_AWAKEN_FAIL_BONUS = 0.05; // 실패할 때마다 다음 성공 확률 +5%p(성공하면 초기화)
// 각성 비용(G) = 희귀도별 기본값 × (지금까지 각성한 횟수 + 1)
export const EQUIPMENT_AWAKEN_GOLD_BASE_BY_RARITY = [3000, 8000, 20000, 50000, 120000];
export const EQUIPMENT_BASE_SLOTS = 3;
export const EQUIPMENT_MAX_SLOTS = 5;
export const EQUIPMENT_SLOT_EXPAND_COSTS = [300, 666]; // 4번째, 5번째 슬롯 확장 비용(다이아). 세트 효과 때문에 슬롯이 늘수록 이득이 커진다.
// 세트 효과: 같은 세트의 장비를 2개 / 3개 장착하면 공격력·방어력·HP가 모두 이만큼 오른다(희귀도 0~4, 3개가 2개를 대신한다).
export const EQUIPMENT_SET_BONUS_2 = [0.01, 0.015, 0.02, 0.03, 0.04];
export const EQUIPMENT_SET_BONUS_3 = [0.03, 0.045, 0.06, 0.09, 0.12];
// 장비 조각: 쓰지 않는 중복 장비(복사본)를 분해해서 얻고, 레벨업에 모자란 복사본을 조각+골드로 메꾼다.
// 분해로 얻는 양보다 메꾸는 데 드는 양이 1.5배라서 같은 장비를 직접 모으는 쪽이 늘 이득이다.
export const EQUIPMENT_SHARDS_PER_COPY = [4, 10, 25, 60, 150]; // 복사본 1개를 분해하면 얻는 조각(희귀도 0~4)
export const EQUIPMENT_SHARD_COST_PER_COPY = [6, 15, 38, 90, 225]; // 모자란 복사본 1개를 메꾸는 데 드는 조각
export const EQUIPMENT_SHARD_GOLD_PER_COPY = [100, 300, 1000, 3000, 10000]; // 모자란 복사본 1개를 메꾸는 데 드는 골드
// 투기장에서 장비 효과를 얼마나 반영할지(1 = 100%). 밸런스가 무너지면 이 값만 낮추면 된다.
export const PVP_EQUIPMENT_EFFECT_RATE = 1;

export const LEVEL_XP_BASE = 100; // 1레벨 → 2레벨에 필요한 경험치
export const LEVEL_XP_GROWTH = 1.15; // 레벨이 오를 때마다 필요 경험치가 1.15배씩 늘어난다

export interface LevelProgress {
  level: number;
  currentXp: number; // 현재 레벨 구간에서 쌓은 경험치
  requiredXp: number; // 다음 레벨까지 필요한 경험치
}

// 누적 경험치를 "레벨 1부터 base, 레벨마다 growth배씩 늘어나는 요구치"로 환산하는 공용 로직.
// 계정 레벨과 종별 전투 레벨이 같은 방식을 쓰므로 하나로 공유한다.
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

// 종의 희귀도·현재 전투 레벨·훈련 강도로 1회 훈련 비용(코인)을 계산한다.
// 프론트(gameCalc.ts)에도 같은 함수가 있다. 값을 바꿀 땐 두 곳을 함께 고쳐야 한다.
export function getTrainCost(rarity: number, level: number, intensity: number): number {
  const base = TRAIN_BASE_COST_BY_RARITY[rarity] ?? TRAIN_BASE_COST_BY_RARITY[0];
  const mult = TRAIN_COST_MULT_BY_INTENSITY[intensity] ?? 1;
  return Math.round(base * Math.pow(TRAIN_COST_LEVEL_GROWTH, level - 1) * mult);
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function getCapacity(spaceLevel: number): number {
  return BASE_CAPACITY + spaceLevel * CAPACITY_PER_LEVEL;
}

// 사육장을 하나 더 추가하는 비용. ownedCount는 현재 보유한 사육장 수(2번째 = 8,750 G, 이후 2.5배씩).
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

// 희귀도와 계열이 모두 맞는 종 중에서 고른다(서바이벌 적의 표시용). 맞는 종이 없으면 희귀도만 맞춘다.
export function pickRandomOfRarityAndFamily(
  speciesList: Species[],
  rarity: number,
  family: SpeciesFamily,
  random: number,
): Species {
  const pool = speciesList.filter((s) => s.rarity === rarity && resolveFamily(s) === family);
  if (pool.length === 0) return pickRandomOfRarity(speciesList, rarity, random);
  return pool[Math.min(pool.length - 1, Math.floor(random * pool.length))];
}

// ---- 야생 배틀 ----
// 프론트(gameCalc.ts)에도 같은 함수가 있다(결과 미리보기용). 값을 바꿀 땐 두 곳을 함께 고쳐야 한다.
export interface CombatStats {
  hp: number;
  atk: number;
  def: number;
}

// 희귀도와 전투 레벨로 기본 전투 스탯을 정한다. 종마다 따로 입력하지 않아도 된다.
// 레벨은 전투 경험치로 오르는 종별 레벨이다(계정 레벨과는 별개). 레벨 1이 기본값이다.
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

// 같은 희귀도·레벨이라도 개체마다 조금씩 다르게. 전투 시작 시 양쪽에 한 번씩 적용한다.
export function rollCombatStats(
  rarity: number,
  level = 1,
  random: () => number = Math.random,
  bonuses: StatBonuses = NO_BONUSES,
): CombatStats {
  const base = getCombatBaseStats(rarity, level);
  // 장비 보너스는 편차를 주기 전에 곱한다(반올림은 편차까지 적용한 뒤에 한 번만 한다).
  const vary = (v: number) => Math.max(1, Math.round(v * (1 - BATTLE_STAT_VARIANCE + random() * BATTLE_STAT_VARIANCE * 2)));
  return {
    hp: vary(base.hp * (1 + bonuses.hp)),
    atk: vary(base.atk * (1 + bonuses.atk)),
    def: vary(base.def * (1 + bonuses.def)),
  };
}

// ---- 장비 계산 ----
// 프론트(gameCalc.ts)에도 같은 함수가 있다(미리보기용). 값을 바꿀 땐 두 곳을 함께 고쳐야 한다.
export interface StatBonuses {
  hp: number;
  atk: number;
  def: number;
}
export const NO_BONUSES: StatBonuses = { hp: 0, atk: 0, def: 0 };

export interface EquipmentItemLike {
  itemId: string;
  level: number;
  awakenCount: number;
}

const EQUIPMENT_STAT_BY_CATEGORY: Record<EquipmentCategory, keyof StatBonuses> = {
  weapon: 'atk',
  armor: 'def',
  charm: 'hp',
};

// 장비 1개가 올려주는 스탯 비율 = 기본값 × (1 + 레벨 보너스 × (레벨-1) + 각성 보너스 × 각성 횟수)
export function getEquipmentBonus(rarity: number, level: number, awakenCount: number): number {
  const multiplier =
    1 + EQUIPMENT_LEVEL_BONUS * (level - 1) + EQUIPMENT_AWAKEN_BONUS * awakenCount;
  return (EQUIPMENT_BASE_BONUS_BY_RARITY[rarity] ?? 0) * multiplier;
}

// 장착한 슬롯들(itemId, 빈 칸은 '')과 보유 장비 상태로 스탯별 보너스를 합산한다.
// 예전에 만든 계정은 장비 필드가 아예 없을 수 있어서(.lean() 조회) undefined도 받는다.
export function computeEquipmentBonuses(
  slots: readonly string[] | undefined,
  items: readonly EquipmentItemLike[] | undefined,
  rate = 1,
): StatBonuses {
  const result: StatBonuses = { hp: 0, atk: 0, def: 0 };
  const used = new Set<string>();
  const setCounts = new Map<string, { count: number; rarity: number }>();
  for (const itemId of slots ?? []) {
    if (!itemId || used.has(itemId)) continue;
    used.add(itemId);
    const def = EQUIPMENT_BY_ID.get(itemId);
    const state = (items ?? []).find((i) => i.itemId === itemId);
    if (!def || !state) continue;
    result[EQUIPMENT_STAT_BY_CATEGORY[def.category]] +=
      getEquipmentBonus(def.rarity, state.level, state.awakenCount) * rate;
    const entry = setCounts.get(def.setId) ?? { count: 0, rarity: def.rarity };
    entry.count += 1;
    setCounts.set(def.setId, entry);
  }
  // 세트 효과는 모든 스탯에 같은 비율로 더해진다.
  for (const { count, rarity } of setCounts.values()) {
    const bonus = getEquipmentSetBonus(count, rarity) * rate;
    result.hp += bonus;
    result.atk += bonus;
    result.def += bonus;
  }
  return result;
}

// 같은 세트 장비를 count개 장착했을 때 모든 스탯에 더해지는 비율(1개 이하는 0, 3개 이상은 3개 효과).
export function getEquipmentSetBonus(count: number, rarity: number): number {
  if (count >= 3) return EQUIPMENT_SET_BONUS_3[rarity] ?? 0;
  if (count === 2) return EQUIPMENT_SET_BONUS_2[rarity] ?? 0;
  return 0;
}

// 레벨업에 모자란 복사본을 조각과 골드로 메꾸는 비용. 이미 모은 복사본을 먼저 쓰고, 모자란 만큼에만 비용이 든다.
export function getShardLevelUpCost(rarity: number, level: number, copies: number) {
  const missing = Math.max(0, getEquipmentLevelUpCopies(level) - copies);
  return {
    missing,
    shards: missing * (EQUIPMENT_SHARD_COST_PER_COPY[rarity] ?? EQUIPMENT_SHARD_COST_PER_COPY[0]),
    gold: missing * (EQUIPMENT_SHARD_GOLD_PER_COPY[rarity] ?? EQUIPMENT_SHARD_GOLD_PER_COPY[0]),
  };
}

// 보유 장비를 업적용 숫자로 요약한다. 프론트(gameCalc.ts)에도 같은 함수가 있다.
// 전설 이상(legend)에는 신화(mythic)도 포함된다.
export interface EquipmentSummary {
  owned: number;
  legend: number;
  mythic: number;
  maxLevel: number;
  awakenings: number;
  slots: number;
}

export function summarizeEquipment(
  items: readonly EquipmentItemLike[] | undefined,
  slotCount: number,
): EquipmentSummary {
  const summary: EquipmentSummary = {
    owned: 0,
    legend: 0,
    mythic: 0,
    maxLevel: 0,
    awakenings: 0,
    slots: slotCount,
  };
  for (const item of items ?? []) {
    const def = EQUIPMENT_BY_ID.get(item.itemId);
    if (!def) continue;
    summary.owned += 1;
    if (def.rarity >= 3) summary.legend += 1;
    if (def.rarity >= 4) summary.mythic += 1;
    summary.maxLevel = Math.max(summary.maxLevel, item.level);
    summary.awakenings += item.awakenCount;
  }
  return summary;
}

// 미리보기용: 기본 스탯에 보너스를 곱해 반올림한다.
export function applyStatBonuses(stats: CombatStats, bonuses: StatBonuses): CombatStats {
  return {
    hp: Math.round(stats.hp * (1 + bonuses.hp)),
    atk: Math.round(stats.atk * (1 + bonuses.atk)),
    def: Math.round(stats.def * (1 + bonuses.def)),
  };
}

// 레벨업에 필요한 "중복 획득" 개수 = 지금 레벨 수치.
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

// minRarity 미만은 제외하고 나머지 확률을 다시 정규화해서 희귀도를 뽑는다(보장/천장 처리용).
export function rollEquipmentRarity(random: number, minRarity = 0): number {
  const odds = EQUIPMENT_PULL_ODDS.map((o, i) => (i >= minRarity ? o : 0));
  const total = odds.reduce((a, b) => a + b, 0);
  let r = random * total;
  for (let i = 0; i < odds.length; i++) {
    if (odds[i] === 0) continue;
    if (r < odds[i]) return i;
    r -= odds[i];
  }
  return odds.length - 1;
}

export function pickEquipmentOfRarity(rarity: number, random: number): EquipmentCatalogItem {
  const pool = EQUIPMENT_CATALOG.filter((e) => e.rarity === rarity);
  return pool[Math.min(pool.length - 1, Math.floor(random * pool.length))];
}

// 야생 개체의 레벨은 내 종 레벨 기준 ±1에서 고른다(각각 1/3 확률). 1레벨 밑으로는 내려가지 않는다.
export function rollEnemyLevel(myLevel: number, random: () => number = Math.random): number {
  const delta = Math.floor(random() * 3) - 1; // -1, 0, 1
  return Math.max(1, myLevel + delta);
}

export interface BattleTurn {
  turn: number;
  attacker: 'me' | 'enemy';
  damage: number;
  remainingHp: number;
  // 아래 셋은 보스 패턴이 있을 때만 붙는다. 일반 전투 로그에는 나오지 않는다.
  note?: string; // 이번 턴에 발동한 패턴 설명(연출용)
  myHp?: number; // 이 턴 도중 내 HP가 상대 공격 말고도 바뀐 경우(가시갑옷 반사)의 최종 HP
  enemyHp?: number; // 이 턴 도중 보스 HP가 내 공격 말고도 바뀐 경우(재생)의 최종 HP
}

export interface BattleResult {
  winner: 'me' | 'enemy';
  log: BattleTurn[];
}

// 공격력에서 방어력을 깎고 약간의 편차를 더한다. 최소 1의 피해는 항상 들어간다.
function rollDamage(atk: number, def: number, random: () => number): number {
  const raw = atk * (1 - BATTLE_DAMAGE_VARIANCE + random() * BATTLE_DAMAGE_VARIANCE * 2) - def * 0.5;
  return Math.max(1, Math.round(raw));
}

// 내 쪽이 먼저 공격하고 번갈아 가며 턴을 진행한다. 턴 수를 넘기면 남은 체력 비율로 판정한다.
export function simulateBattle(
  mine: CombatStats,
  enemy: CombatStats,
  random: () => number = Math.random,
): BattleResult {
  let myHp = mine.hp;
  let enemyHp = enemy.hp;
  const log: BattleTurn[] = [];

  for (let turn = 1; turn <= BATTLE_MAX_TURNS; turn++) {
    const toEnemy = rollDamage(mine.atk, enemy.def, random);
    enemyHp = Math.max(0, enemyHp - toEnemy);
    log.push({ turn, attacker: 'me', damage: toEnemy, remainingHp: enemyHp });
    if (enemyHp <= 0) return { winner: 'me', log };

    const toMe = rollDamage(enemy.atk, mine.def, random);
    myHp = Math.max(0, myHp - toMe);
    log.push({ turn, attacker: 'enemy', damage: toMe, remainingHp: myHp });
    if (myHp <= 0) return { winner: 'enemy', log };
  }
  return { winner: myHp >= enemyHp ? 'me' : 'enemy', log };
}

// ---- 보스 타워 ----
// 층 정보(상대 종·스탯·패턴·보상)는 서버가 GET /boss로 내려주므로 프론트에는 이 계산이 없다.
// 단, 프론트(gameCalc.ts)가 화면에 쓰는 BOSS_DAILY_ATTEMPTS는 같은 값을 따로 둔다.
export const BOSS_DAILY_ATTEMPTS = 5;
export const BOSS_FLOOR_COUNT = 50;
export const BOSS_FLOOR_INTERVAL = 5; // 5층마다 보스(패턴이 붙는다)
export const BOSS_COOLDOWN_MS = 15 * 60_000; // 보스 전투 쿨타임(하루 횟수 제한과 별개로 적용된다)
// 다이아로 사는 편의 기능. 오늘 N번째 추가 도전의 가격(💎)이고, 배열 길이가 하루에 살 수 있는 최대 횟수다.
export const BOSS_EXTRA_ATTEMPT_COSTS: readonly number[] = [20, 40, 60];
export const BOSS_COOLDOWN_SKIP_SECONDS_PER_DIAMOND = 180; // 남은 쿨타임 3분마다 💎1(올림), 꽉 찬 15분이면 💎5

// 쿨타임 건너뛰기 가격: 남은 시간이 길수록 비싸고, 아무리 조금 남았어도 최소 💎1이다.
export function getBossCooldownSkipCost(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / 1000 / BOSS_COOLDOWN_SKIP_SECONDS_PER_DIAMOND));
}

// 1층 기준 스탯과 층마다 곱해지는 성장률. 보스 층은 체력/공격/방어를 따로 한 번 더 곱한다.
export const BOSS_BASE_STATS: CombatStats = { hp: 45, atk: 9, def: 4 };
export const BOSS_FLOOR_GROWTH = 1.15; // 층이 오를 때마다 체력·공격·방어가 15%씩(복리로) 늘어난다
export const BOSS_STAT_MULTIPLIER: CombatStats = { hp: 1.3, atk: 1.15, def: 1.15 };

export const BOSS_FIRST_CLEAR_COINS_BASE = 200;
export const BOSS_FIRST_CLEAR_COINS_PER_FLOOR = 120;
export const BOSS_COINS_BOSS_MULTIPLIER = 3;
export const BOSS_REPEAT_COIN_RATIO = 0.25;
export const BOSS_REPEAT_COPY_CHANCE = 0.4; // 이미 깬 보스 층을 다시 이겼을 때 장비 복사본이 나올 확률
export const BOSS_FIRST_CLEAR_DIAMONDS = 10; // 보스 층을 처음 깼을 때 받는 다이아
export const BOSS_REPEAT_DIAMOND_CHANCE = 0.02; // 이미 깬 보스 층을 다시 이겼을 때 다이아가 나올 확률
export const BOSS_REPEAT_DIAMONDS = 5; // 그때 나오는 다이아 개수
export const BOSS_SPECIES_XP_BASE = 10;
export const BOSS_SPECIES_XP_PER_FLOOR = 4;
export const BOSS_ACCOUNT_XP_BASE = 10;
export const BOSS_ACCOUNT_XP_PER_FLOOR = 1;
export const BOSS_LOSE_ACCOUNT_XP = 3;

export type BossPattern = 'guard' | 'enrage' | 'heavy' | 'regen' | 'thorns';

export const BOSS_GUARD_EVERY = 3; // 3턴마다 웅크려서
export const BOSS_GUARD_DAMAGE_MULT = 0.4; // 그 턴에 받는 피해가 40%로 줄어든다
export const BOSS_ENRAGE_HP_RATIO = 0.5; // HP가 절반 이하가 되면
export const BOSS_ENRAGE_ATK_MULT = 1.5; // 공격력이 1.5배가 된다(이후 계속)
export const BOSS_HEAVY_EVERY = 4; // 보스가 4번째 공격마다
export const BOSS_HEAVY_MULT = 2; // 피해가 2배
export const BOSS_REGEN_RATIO = 0.03; // 보스 턴마다 최대 HP의 3% 회복
export const BOSS_THORNS_RATIO = 0.15; // 내가 준 피해의 15%를 되돌려 받는다

export interface BossPatternInfo {
  id: BossPattern;
  name: string;
  description: string;
}

export const BOSS_PATTERNS: Record<BossPattern, BossPatternInfo> = {
  guard: {
    id: 'guard',
    name: '웅크리기',
    description: `${BOSS_GUARD_EVERY}턴마다 웅크려서 그 턴에 받는 피해가 ${Math.round(BOSS_GUARD_DAMAGE_MULT * 100)}%로 줄어요.`,
  },
  enrage: {
    id: 'enrage',
    name: '분노',
    description: `HP가 ${Math.round(BOSS_ENRAGE_HP_RATIO * 100)}% 이하가 되면 공격력이 ${BOSS_ENRAGE_ATK_MULT}배가 돼요.`,
  },
  heavy: {
    id: 'heavy',
    name: '강타',
    description: `${BOSS_HEAVY_EVERY}번째 공격마다 피해가 ${BOSS_HEAVY_MULT}배로 들어와요.`,
  },
  regen: {
    id: 'regen',
    name: '재생',
    description: `자기 턴마다 최대 HP의 ${Math.round(BOSS_REGEN_RATIO * 100)}%를 회복해요.`,
  },
  thorns: {
    id: 'thorns',
    name: '가시갑옷',
    description: `내가 준 피해의 ${Math.round(BOSS_THORNS_RATIO * 100)}%가 나에게 되돌아와요.`,
  },
};

// 보스 층별 패턴. 층이 오를수록 겹쳐서 붙는다.
const BOSS_PATTERNS_BY_FLOOR: Record<number, BossPattern[]> = {
  5: ['guard'],
  10: ['enrage'],
  15: ['heavy'],
  20: ['regen'],
  25: ['thorns'],
  30: ['guard', 'enrage'],
  35: ['heavy', 'regen'],
  40: ['enrage', 'thorns'],
  45: ['guard', 'heavy', 'thorns'],
  50: ['enrage', 'heavy', 'regen'],
};

export interface BossFloorRewards {
  firstCoins: number;
  firstDiamonds: number;
  // 다시 이겼을 때 다이아가 나올 확률과 개수(보스 층만). 일반 층은 0
  repeatDiamondChance: number;
  repeatDiamonds: number;
  // 첫 클리어 때 확정으로 주는 장비 희귀도(보스 층만). 일반 층은 null
  firstEquipmentRarity: number | null;
  repeatCoins: number;
  // 다시 이겼을 때 복사본이 나올 확률(보스 층만). 일반 층은 0
  repeatCopyChance: number;
}

export interface BossFloor {
  floor: number;
  isBoss: boolean;
  speciesRarity: number; // 화면에 나올 종의 희귀도. 스탯과는 별개다
  stats: CombatStats; // 편차를 주기 전 기준 스탯
  patterns: BossPattern[];
  rewards: BossFloorRewards;
}

export function isBossFloor(floor: number): boolean {
  return floor % BOSS_FLOOR_INTERVAL === 0;
}

// 어떤 종이 나올지는 층 번호로 고정해서(같은 층은 항상 같은 상대) 도감처럼 미리 볼 수 있게 한다.
export function bossFloorSpeciesRandom(floor: number): number {
  return (floor * 0.6180339887) % 1;
}

export function getBossFloor(floor: number): BossFloor | null {
  if (!Number.isInteger(floor) || floor < 1 || floor > BOSS_FLOOR_COUNT) return null;
  const isBoss = isBossFloor(floor);
  const growth = Math.pow(BOSS_FLOOR_GROWTH, floor - 1);
  const mult = (stat: keyof CombatStats) =>
    Math.round(BOSS_BASE_STATS[stat] * growth * (isBoss ? BOSS_STAT_MULTIPLIER[stat] : 1));
  const firstCoins =
    (BOSS_FIRST_CLEAR_COINS_BASE + BOSS_FIRST_CLEAR_COINS_PER_FLOOR * floor) *
    (isBoss ? BOSS_COINS_BOSS_MULTIPLIER : 1);
  const equipmentRarity = floor >= 50 ? 4 : floor >= 30 ? 3 : floor >= 15 ? 2 : 1;
  return {
    floor,
    isBoss,
    // 보스 층은 한 단계 위 희귀도의 종으로 보여준다(최대 신화).
    speciesRarity: Math.min(4, Math.floor((floor - 1) / 10) + (isBoss ? 1 : 0)),
    stats: { hp: mult('hp'), atk: mult('atk'), def: mult('def') },
    patterns: isBoss ? (BOSS_PATTERNS_BY_FLOOR[floor] ?? []) : [],
    rewards: {
      firstCoins,
      firstDiamonds: isBoss ? BOSS_FIRST_CLEAR_DIAMONDS : 0,
      repeatDiamondChance: isBoss ? BOSS_REPEAT_DIAMOND_CHANCE : 0,
      repeatDiamonds: isBoss ? BOSS_REPEAT_DIAMONDS : 0,
      firstEquipmentRarity: isBoss ? equipmentRarity : null,
      repeatCoins: Math.round(firstCoins * BOSS_REPEAT_COIN_RATIO),
      repeatCopyChance: isBoss ? BOSS_REPEAT_COPY_CHANCE : 0,
    },
  };
}

// 보스 스탯에도 일반 개체처럼 ±15% 편차를 준다(전투 시작 시 한 번).
export function rollBossStats(stats: CombatStats, random: () => number = Math.random): CombatStats {
  const vary = (v: number) =>
    Math.max(1, Math.round(v * (1 - BATTLE_STAT_VARIANCE + random() * BATTLE_STAT_VARIANCE * 2)));
  return { hp: vary(stats.hp), atk: vary(stats.atk), def: vary(stats.def) };
}

// ---- 보스 난이도 ----
// 보스의 능력치(HP·공격·방어)와 골드·경험치 보상에 곱해지는 배율. 난이도마다 깬 층(진행도)이 따로라서
// 처음 깨는 보상(다이아·장비 포함)을 난이도별로 한 번씩 받는다. 쉬움(1배)은 난이도가 없던 때와 완전히 같다.
// 프론트(gameCalc.ts)에 진행도 필드 이름(BOSS_PROGRESS_FIELD)과 getBossProgress/getBestBossFloor가 같은 모양으로 있다.
export const BOSS_DIFFICULTIES = [
  { id: 'easy', name: '쉬움', multiplier: 1 },
  { id: 'normal', name: '보통', multiplier: 1.5 },
  { id: 'hard', name: '어려움', multiplier: 2 },
  { id: 'extreme', name: '매우 어려움', multiplier: 3 },
] as const;
export type BossDifficulty = (typeof BOSS_DIFFICULTIES)[number]['id'];
export const BOSS_DIFFICULTY_IDS: readonly BossDifficulty[] = BOSS_DIFFICULTIES.map((d) => d.id);
export const BOSS_DEFAULT_DIFFICULTY: BossDifficulty = 'easy';

export function getBossDifficulty(id: string) {
  return BOSS_DIFFICULTIES.find((d) => d.id === id) ?? null;
}

// 난이도별로 깬 최고 층이 저장되는 stats 필드. 쉬움은 난이도가 생기기 전부터 쓰던 highestBossFloor를 그대로 쓴다.
export const BOSS_PROGRESS_FIELD = {
  easy: 'highestBossFloor',
  normal: 'bossFloorNormal',
  hard: 'bossFloorHard',
  extreme: 'bossFloorExtreme',
} as const;
export type BossProgressStats = Partial<Record<(typeof BOSS_PROGRESS_FIELD)[BossDifficulty], number>>;

export function getBossProgress(stats: BossProgressStats | undefined, difficulty: BossDifficulty): number {
  return stats?.[BOSS_PROGRESS_FIELD[difficulty]] ?? 0;
}

// 어느 난이도에서든 깬 가장 높은 층(업적용). 어려운 난이도의 층은 쉬움보다 어려우니 그대로 비교해도 공정하다.
export function getBestBossFloor(stats: BossProgressStats | undefined): number {
  return Math.max(0, ...BOSS_DIFFICULTY_IDS.map((d) => getBossProgress(stats, d)));
}

// 능력치가 m배 세지는 것은 층이 log(m)/log(성장률)층 올라가는 것과 같다. 랭킹에서 난이도가 다른 기록을 한 줄로 세울 때 쓴다.
export function getBossEffectiveFloor(floor: number, difficulty: BossDifficulty): number {
  const multiplier = getBossDifficulty(difficulty)?.multiplier ?? 1;
  return floor + Math.round(Math.log(multiplier) / Math.log(BOSS_FLOOR_GROWTH));
}

// 보스 기준 스탯에 난이도 배율을 곱한다(반올림한 정수). 편차는 이 값에 다시 붙는다.
export function scaleBossStats(stats: CombatStats, multiplier: number): CombatStats {
  return {
    hp: Math.max(1, Math.round(stats.hp * multiplier)),
    atk: Math.max(1, Math.round(stats.atk * multiplier)),
    def: Math.max(1, Math.round(stats.def * multiplier)),
  };
}

// 층의 상대 종. 같은 희귀도 안에서 speciesId 순으로 정렬해 고르므로 종 목록 순서가 바뀌어도 같은 층은 같은 상대다
// (종이 새로 추가되면 일부 층의 상대가 바뀔 수는 있다).
export function pickBossSpecies<T extends { speciesId: string; rarity: number }>(
  floor: BossFloor,
  speciesList: readonly T[],
): T {
  const pool = speciesList
    .filter((s) => s.rarity === floor.speciesRarity)
    .sort((a, b) => (a.speciesId < b.speciesId ? -1 : a.speciesId > b.speciesId ? 1 : 0));
  return pool[Math.min(pool.length - 1, Math.floor(bossFloorSpeciesRandom(floor.floor) * pool.length))];
}

// 보스전도 내가 먼저 공격하고 번갈아 진행한다. 패턴 효과는 로그의 note로 남겨 화면에서 보여준다.
// 20턴을 넘기면 남은 체력 "비율"로 판정한다(체력이 큰 보스가 불리하게 판정되지 않도록).
export function simulateBossBattle(
  mine: CombatStats,
  boss: CombatStats,
  patterns: readonly BossPattern[],
  random: () => number = Math.random,
): BattleResult {
  const has = (p: BossPattern) => patterns.includes(p);
  let myHp = mine.hp;
  let bossHp = boss.hp;
  let enraged = false;
  const log: BattleTurn[] = [];

  for (let turn = 1; turn <= BATTLE_MAX_TURNS; turn++) {
    // 내 공격
    let toBoss = rollDamage(mine.atk, boss.def, random);
    const myNotes: string[] = [];
    if (has('guard') && turn % BOSS_GUARD_EVERY === 0) {
      toBoss = Math.max(1, Math.round(toBoss * BOSS_GUARD_DAMAGE_MULT));
      myNotes.push('🛡️ 웅크리기! 받는 피해가 줄었어요');
    }
    bossHp = Math.max(0, bossHp - toBoss);
    const myTurn: BattleTurn = { turn, attacker: 'me', damage: toBoss, remainingHp: bossHp };
    if (bossHp <= 0) {
      if (myNotes.length) myTurn.note = myNotes.join(' · ');
      log.push(myTurn);
      return { winner: 'me', log };
    }
    if (has('thorns')) {
      const reflected = Math.max(1, Math.round(toBoss * BOSS_THORNS_RATIO));
      myHp = Math.max(0, myHp - reflected);
      myTurn.myHp = myHp;
      myNotes.push(`🌵 가시갑옷! ${reflected} 반사`);
    }
    if (myNotes.length) myTurn.note = myNotes.join(' · ');
    log.push(myTurn);
    if (myHp <= 0) return { winner: 'enemy', log };

    // 보스 공격
    const bossNotes: string[] = [];
    let healedHp: number | undefined;
    if (has('regen') && bossHp < boss.hp) {
      const heal = Math.max(1, Math.round(boss.hp * BOSS_REGEN_RATIO));
      bossHp = Math.min(boss.hp, bossHp + heal);
      healedHp = bossHp;
      bossNotes.push(`💚 재생! +${heal}`);
    }
    if (has('enrage') && !enraged && bossHp <= boss.hp * BOSS_ENRAGE_HP_RATIO) {
      enraged = true;
      bossNotes.push('🔥 분노! 공격력이 올라갔어요');
    }
    let toMe = rollDamage(enraged ? boss.atk * BOSS_ENRAGE_ATK_MULT : boss.atk, mine.def, random);
    if (has('heavy') && turn % BOSS_HEAVY_EVERY === 0) {
      toMe = Math.round(toMe * BOSS_HEAVY_MULT);
      bossNotes.push('💥 강타!');
    }
    myHp = Math.max(0, myHp - toMe);
    const bossTurn: BattleTurn = { turn, attacker: 'enemy', damage: toMe, remainingHp: myHp };
    if (healedHp !== undefined) bossTurn.enemyHp = healedHp;
    if (bossNotes.length) bossTurn.note = bossNotes.join(' · ');
    log.push(bossTurn);
    if (myHp <= 0) return { winner: 'enemy', log };
  }
  return { winner: myHp / mine.hp >= bossHp / boss.hp ? 'me' : 'enemy', log };
}

// ---- 보스 직접 전투 ----
// 자동 전투와 같은 능력치·패턴·보상으로, 매 턴 플레이어가 행동을 고른다. 서버가 전투 상태를 들고 한 턴씩 진행하고,
// '공격'만 계속 고르면 자동 전투(simulateBossBattle)와 같은 규칙이다. 보스 패턴 중 강타·웅크리기는 턴 번호로 정해져서
// 그 턴이 오기 전에 미리 예고해 줄 수 있고, 플레이어는 예고를 보고 방어하거나 힘을 모아 대응한다.
export type DuelAction = 'attack' | 'guard' | 'strike' | 'heal';
export const DUEL_ACTIONS: readonly DuelAction[] = ['attack', 'guard', 'strike', 'heal'];
export const DUEL_GUARD_TAKEN_MULT = 0.5; // 방어 태세를 취한 턴에 받는 피해
export const DUEL_CHARGE_MULT = 1.5; // 방어로 모은 힘: 다음 공격(강력한 일격 포함)의 피해 배율
export const DUEL_STRIKE_MULT = 1.5; // 강력한 일격의 피해 배율
export const DUEL_STRIKE_COOLDOWN = 3; // 쓴 뒤 3으로 시작해 턴이 끝날 때마다 1씩 줄고, 0이 되면 다시 쓴다(2턴 쉰다)
export const DUEL_STRIKE_RECKLESS_MULT = 1.4; // 강력한 일격을 쓴 턴에 받는 피해(무리한 공격)
export const DUEL_HEAL_RATIO = 0.2; // 회복: 최대 HP의 20%, 한 전투에 한 번

export interface DuelActionInfo {
  id: DuelAction;
  name: string;
  description: string;
}
export const DUEL_ACTION_INFO: readonly DuelActionInfo[] = [
  { id: 'attack', name: '공격', description: '평범하게 공격해요. 자동 전투와 같아요.' },
  {
    id: 'guard',
    name: '방어 태세',
    description: `이번 턴 공격을 쉬고 받는 피해를 ${Math.round((1 - DUEL_GUARD_TAKEN_MULT) * 100)}% 줄여요. 힘을 모아 다음 공격이 ${DUEL_CHARGE_MULT}배가 돼요.`,
  },
  {
    id: 'strike',
    name: '강력한 일격',
    description: `피해 ${DUEL_STRIKE_MULT}배. 쓴 턴에 받는 피해가 ${DUEL_STRIKE_RECKLESS_MULT}배가 되고, 쓰고 나면 ${DUEL_STRIKE_COOLDOWN - 1}턴 쉬어야 해요.`,
  },
  {
    id: 'heal',
    name: '회복',
    description: `이번 턴 공격을 쉬고 최대 HP의 ${Math.round(DUEL_HEAL_RATIO * 100)}%를 회복해요. 한 전투에 한 번만 쓸 수 있어요.`,
  },
];

export interface BossDuelState {
  turn: number; // 지금 행동을 고를 턴(1부터)
  myHp: number;
  bossHp: number;
  enraged: boolean;
  charged: boolean; // 방어로 힘을 모았는지(다음 공격이 강해진다)
  strikeCooldown: number; // 0이면 강력한 일격을 쓸 수 있다
  healUsed: boolean;
}

export function newBossDuelState(mine: CombatStats, boss: CombatStats): BossDuelState {
  return { turn: 1, myHp: mine.hp, bossHp: boss.hp, enraged: false, charged: false, strikeCooldown: 0, healUsed: false };
}

// 이번 턴에 보스가 하려는 일. 패턴이 턴 번호로 정해지는 것만 미리 알 수 있다.
export interface DuelIntent {
  heavy: boolean; // 이번 턴 보스의 공격이 강타(피해 2배)
  guard: boolean; // 이번 턴 보스가 웅크려서 내가 주는 피해가 줄어든다
}

export function getDuelIntent(patterns: readonly BossPattern[], turn: number): DuelIntent {
  return {
    heavy: patterns.includes('heavy') && turn % BOSS_HEAVY_EVERY === 0,
    guard: patterns.includes('guard') && turn % BOSS_GUARD_EVERY === 0,
  };
}

// 지금 상태에서 각 행동을 고를 수 있는지와, 못 고르면 그 이유
export function getDuelActionStates(state: BossDuelState): { id: DuelAction; available: boolean; reason?: string }[] {
  return DUEL_ACTIONS.map((id) => {
    if (id === 'strike' && state.strikeCooldown > 0) {
      return { id, available: false, reason: `${state.strikeCooldown}턴 뒤에 쓸 수 있어요` };
    }
    if (id === 'heal' && state.healUsed) {
      return { id, available: false, reason: '이미 썼어요' };
    }
    return { id, available: true };
  });
}

export interface DuelTurnResult {
  state: BossDuelState; // 이 턴을 마친 상태(winner가 있으면 마지막 상태)
  turns: BattleTurn[]; // 이 턴에 일어난 일(내 행동, 보스 행동)
  winner: 'me' | 'enemy' | null;
}

// 한 턴을 진행한다. 행동을 고를 수 없는 상태(쿨타임·이미 쓴 회복)는 호출 전에 막아야 한다.
export function playDuelTurn(
  mine: CombatStats,
  boss: CombatStats,
  patterns: readonly BossPattern[],
  start: BossDuelState,
  action: DuelAction,
  random: () => number = Math.random,
  // healCapHp: 회복의 기준이 되는 내 최대 HP. 처음 HP가 최대보다 낮은 채로 시작하는 전투(서바이벌)에서 쓴다. 기본은 mine.hp.
  opts: { healCapHp?: number } = {},
): DuelTurnResult {
  const has = (p: BossPattern) => patterns.includes(p);
  const turn = start.turn;
  let { myHp, bossHp, enraged, charged, strikeCooldown, healUsed } = start;
  const turns: BattleTurn[] = [];
  const finish = (winner: 'me' | 'enemy' | null): DuelTurnResult => ({
    state: { turn: turn + 1, myHp, bossHp, enraged, charged, strikeCooldown: Math.max(0, strikeCooldown - 1), healUsed },
    turns,
    winner,
  });

  // ---- 내 행동 ----
  const myNotes: string[] = [];
  let braced = false; // 방어 태세
  let reckless = false; // 강력한 일격
  const myTurn: BattleTurn = { turn, attacker: 'me', damage: 0, remainingHp: bossHp };
  if (action === 'attack' || action === 'strike') {
    let toBoss = rollDamage(mine.atk, boss.def, random);
    if (action === 'strike') {
      toBoss = Math.round(toBoss * DUEL_STRIKE_MULT);
      strikeCooldown = DUEL_STRIKE_COOLDOWN;
      reckless = true;
      myNotes.push('💥 강력한 일격!');
    }
    if (charged) {
      toBoss = Math.round(toBoss * DUEL_CHARGE_MULT);
      charged = false;
      myNotes.push('⚡ 모은 힘을 실었어요');
    }
    if (has('guard') && turn % BOSS_GUARD_EVERY === 0) {
      toBoss = Math.max(1, Math.round(toBoss * BOSS_GUARD_DAMAGE_MULT));
      myNotes.push('🛡️ 웅크리기! 받는 피해가 줄었어요');
    }
    bossHp = Math.max(0, bossHp - toBoss);
    myTurn.damage = toBoss;
    myTurn.remainingHp = bossHp;
    if (bossHp <= 0) {
      if (myNotes.length) myTurn.note = myNotes.join(' · ');
      turns.push(myTurn);
      return finish('me');
    }
    if (has('thorns')) {
      const reflected = Math.max(1, Math.round(toBoss * BOSS_THORNS_RATIO));
      myHp = Math.max(0, myHp - reflected);
      myTurn.myHp = myHp;
      myNotes.push(`🌵 가시갑옷! ${reflected} 반사`);
    }
  } else if (action === 'guard') {
    braced = true;
    charged = true;
    myNotes.push('🛡️ 방어 태세! 힘을 모아요');
  } else {
    const cap = opts.healCapHp ?? mine.hp;
    const healed = Math.min(cap, myHp + Math.round(cap * DUEL_HEAL_RATIO));
    myNotes.push(`🌿 회복 +${healed - myHp}`);
    myHp = healed;
    healUsed = true;
    myTurn.myHp = myHp;
  }
  if (myNotes.length) myTurn.note = myNotes.join(' · ');
  turns.push(myTurn);
  if (myHp <= 0) return finish('enemy');

  // ---- 보스 행동 ---- (자동 전투와 같은 순서: 재생 → 분노 → 공격)
  const bossNotes: string[] = [];
  let healedHp: number | undefined;
  if (has('regen') && bossHp < boss.hp) {
    const heal = Math.max(1, Math.round(boss.hp * BOSS_REGEN_RATIO));
    bossHp = Math.min(boss.hp, bossHp + heal);
    healedHp = bossHp;
    bossNotes.push(`💚 재생! +${heal}`);
  }
  if (has('enrage') && !enraged && bossHp <= boss.hp * BOSS_ENRAGE_HP_RATIO) {
    enraged = true;
    bossNotes.push('🔥 분노! 공격력이 올라갔어요');
  }
  let toMe = rollDamage(enraged ? boss.atk * BOSS_ENRAGE_ATK_MULT : boss.atk, mine.def, random);
  if (has('heavy') && turn % BOSS_HEAVY_EVERY === 0) {
    toMe = Math.round(toMe * BOSS_HEAVY_MULT);
    bossNotes.push('💥 강타!');
  }
  if (braced) {
    toMe = Math.max(1, Math.round(toMe * DUEL_GUARD_TAKEN_MULT));
    bossNotes.push('🛡️ 방어 태세로 피해가 줄었어요');
  }
  if (reckless) {
    toMe = Math.round(toMe * DUEL_STRIKE_RECKLESS_MULT);
    bossNotes.push('⚠️ 무리한 공격이라 더 아프게 맞았어요');
  }
  myHp = Math.max(0, myHp - toMe);
  const bossTurn: BattleTurn = { turn, attacker: 'enemy', damage: toMe, remainingHp: myHp };
  if (healedHp !== undefined) bossTurn.enemyHp = healedHp;
  if (bossNotes.length) bossTurn.note = bossNotes.join(' · ');
  turns.push(bossTurn);
  if (myHp <= 0) return finish('enemy');

  // 턴 수를 모두 쓰면 남은 체력 "비율"로 판정한다(자동 전투와 같다).
  if (turn >= BATTLE_MAX_TURNS) return finish(myHp / mine.hp >= bossHp / boss.hp ? 'me' : 'enemy');
  return finish(null);
}

// ---- 서바이벌(무한 전투) ----
// 식구 한 마리로 HP를 이어가며 적을 계속 쓰러뜨린다. 5스테이지마다 엘리트(보스 패턴)가 나오고, 엘리트를 쓰러뜨리면
// 버프 3개 중 하나를 골라 이어간다. 내 HP가 0이 되면 끝이고, 깬 스테이지 수가 기록이다.
// 진행 중인 런은 서버(GameState.survivalRun)에 저장돼서, 입장할 때 굴린 내 능력치는 런이 끝날 때까지 고정이다.
export const SURVIVAL_DAILY_ATTEMPTS = 3; // 하루 입장 횟수(입장할 때 센다)
export const SURVIVAL_MAX_STAGE = 100; // 안전 상한(도달할 수 없는 값). 넘으면 완주로 끝난다.
export const SURVIVAL_ELITE_EVERY = 5;
export const SURVIVAL_STAGE_GROWTH = 1.08; // 스테이지마다 적 능력치가 8%씩(복리) 늘어난다
export const SURVIVAL_CLEAR_HEAL_RATE = 0.15; // 스테이지를 깰 때마다 최대 HP의 15% 회복
export const SURVIVAL_GOLD_BASE = 15;
export const SURVIVAL_GOLD_PER_STAGE = 5;
export const SURVIVAL_SPECIES_XP_BASE = 6;
export const SURVIVAL_SPECIES_XP_PER_STAGE = 2;
export const SURVIVAL_MILESTONE_EVERY = 5; // 이전 최고 기록을 넘어 새로 지나간 5스테이지 단위마다
export const SURVIVAL_MILESTONE_DIAMONDS = 2; // 다이아를 받는다
// 평생 처음 도달하는 스테이지에서 받는 장비 복사본(스테이지 → 장비 희귀도 0~4)
export const SURVIVAL_FIRST_REACH_EQUIPMENT: Record<number, number> = { 10: 1, 20: 2, 30: 3, 40: 4 };
export const SURVIVAL_CHOICE_COUNT = 3;
// 다이아로 사는 편의 기능
export const SURVIVAL_EXTRA_ATTEMPT_COSTS: readonly number[] = [30, 60, 90]; // 오늘 N번째 추가 입장 가격(💎)
export const SURVIVAL_REVIVE_COSTS: readonly number[] = [30, 60, 120]; // 한 런에서 N번째 부활 가격(💎), 길이 = 런당 최대 부활 횟수
export const SURVIVAL_REVIVE_HP_RATE = 0.6; // 부활하면 최대 HP의 60%로 되살아난다

export type SurvivalBuffId = 'atk' | 'def' | 'hp' | 'heal' | 'regen';
export const SURVIVAL_ATK_BUFF = 0.25; // 공격력 +25%(기본값 기준, 중첩하면 더해진다)
export const SURVIVAL_DEF_BUFF = 0.35; // 방어는 피해 계산에서 절반만 반영돼서 크게 준다
export const SURVIVAL_HP_BUFF = 0.25;
export const SURVIVAL_HEAL_BUFF = 0.5; // 최대 HP의 50% 즉시 회복
export const SURVIVAL_REGEN_BUFF = 0.05; // 스테이지를 깰 때의 회복량 +5%p

export interface SurvivalBuffInfo {
  id: SurvivalBuffId;
  name: string;
  description: string;
}
export const SURVIVAL_BUFFS: readonly SurvivalBuffInfo[] = [
  { id: 'atk', name: '날카로운 이빨', description: `공격력 +${Math.round(SURVIVAL_ATK_BUFF * 100)}%` },
  { id: 'def', name: '단단한 껍질', description: `방어력 +${Math.round(SURVIVAL_DEF_BUFF * 100)}%` },
  {
    id: 'hp',
    name: '튼튼한 체력',
    description: `최대 HP +${Math.round(SURVIVAL_HP_BUFF * 100)}% (늘어난 만큼 바로 회복)`,
  },
  { id: 'heal', name: '숲의 휴식', description: `HP를 최대의 ${Math.round(SURVIVAL_HEAL_BUFF * 100)}% 회복` },
  {
    id: 'regen',
    name: '빠른 회복',
    description: `스테이지를 깰 때마다 회복량 +${Math.round(SURVIVAL_REGEN_BUFF * 100)}%p`,
  },
];
export const SURVIVAL_BUFF_IDS: readonly SurvivalBuffId[] = SURVIVAL_BUFFS.map((b) => b.id);

export interface SurvivalBuffCounts {
  atk: number;
  def: number;
  hp: number;
  regen: number;
}

// 서버에 저장되는 진행 상태(순수 계산용). base*는 입장할 때 굴린 능력치이고, 현재 능력치는 버프 횟수로 계산한다.
export interface SurvivalState {
  stage: number; // 마지막으로 깬 스테이지(처음엔 0)
  hp: number;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  buffs: SurvivalBuffCounts;
}

export function getSurvivalStats(state: Pick<SurvivalState, 'baseHp' | 'baseAtk' | 'baseDef' | 'buffs'>) {
  return {
    maxHp: Math.max(1, Math.round(state.baseHp * (1 + SURVIVAL_HP_BUFF * state.buffs.hp))),
    atk: Math.max(1, Math.round(state.baseAtk * (1 + SURVIVAL_ATK_BUFF * state.buffs.atk))),
    def: Math.max(1, Math.round(state.baseDef * (1 + SURVIVAL_DEF_BUFF * state.buffs.def))),
    healRate: SURVIVAL_CLEAR_HEAL_RATE + SURVIVAL_REGEN_BUFF * state.buffs.regen,
  };
}

// 스테이지의 적. 5의 배수는 엘리트(능력치가 더 높고 보스 패턴이 붙는다). 30스테이지부터는 패턴이 두 개 겹친다.
const SURVIVAL_PATTERN_ORDER: readonly BossPattern[] = ['guard', 'regen', 'heavy', 'enrage', 'thorns'];
export function getSurvivalEnemy(stage: number) {
  const isElite = stage % SURVIVAL_ELITE_EVERY === 0;
  const growth = Math.pow(SURVIVAL_STAGE_GROWTH, stage - 1);
  const stat = (k: keyof CombatStats) =>
    Math.max(1, Math.round(BOSS_BASE_STATS[k] * growth * (isElite ? BOSS_STAT_MULTIPLIER[k] : 1)));
  const patterns: BossPattern[] = [];
  if (isElite) {
    const index = stage / SURVIVAL_ELITE_EVERY - 1;
    patterns.push(SURVIVAL_PATTERN_ORDER[index % SURVIVAL_PATTERN_ORDER.length]);
    if (stage >= 30) patterns.push(SURVIVAL_PATTERN_ORDER[(index + 2) % SURVIVAL_PATTERN_ORDER.length]);
  }
  const tier = Math.min(4, Math.floor((stage - 1) / 10));
  return {
    stage,
    isElite,
    stats: { hp: stat('hp'), atk: stat('atk'), def: stat('def') } as CombatStats,
    patterns,
    // 화면에 보일 종의 희귀도(능력치와는 별개). 엘리트는 한 단계 위로 보여준다.
    speciesRarity: Math.min(4, tier + (isElite ? 1 : 0)),
  };
}

// 엘리트를 쓰러뜨린 뒤 보여줄 버프 후보 3개(서로 다르게)
export function rollSurvivalChoices(random: () => number = Math.random): SurvivalBuffId[] {
  const pool = [...SURVIVAL_BUFF_IDS];
  const picked: SurvivalBuffId[] = [];
  while (picked.length < SURVIVAL_CHOICE_COUNT && pool.length > 0) {
    picked.push(pool.splice(Math.min(pool.length - 1, Math.floor(random() * pool.length)), 1)[0]);
  }
  return picked;
}

// 버프를 적용한 새 상태를 돌려준다(원본은 바꾸지 않는다).
export function applySurvivalBuff(state: SurvivalState, buff: SurvivalBuffId): SurvivalState {
  const next: SurvivalState = { ...state, buffs: { ...state.buffs } };
  const before = getSurvivalStats(state);
  if (buff === 'heal') {
    next.hp = Math.min(before.maxHp, state.hp + Math.round(before.maxHp * SURVIVAL_HEAL_BUFF));
  } else {
    next.buffs[buff] += 1;
    if (buff === 'hp') {
      // 최대 HP가 늘어난 만큼 현재 HP도 함께 늘어난다.
      next.hp = state.hp + (getSurvivalStats(next).maxHp - before.maxHp);
    }
  }
  return next;
}

// 싸움이 끝난 뒤 내 남은 HP. 로그에서 내 HP가 마지막으로 바뀐 값을 찾는다(내가 먼저 쓰러뜨리면 상대 공격이 없어 그대로다).
function myHpAfterBattle(log: BattleTurn[], startHp: number): number {
  for (let i = log.length - 1; i >= 0; i--) {
    const t = log[i];
    if (t.myHp !== undefined) return t.myHp;
    if (t.attacker === 'enemy') return t.remainingHp;
  }
  return startHp;
}

export interface SurvivalStageResult {
  stage: number;
  isElite: boolean;
  patterns: BossPattern[];
  enemyStats: CombatStats;
  speciesRarity: number;
  hpBefore: number;
  hpAfter: number; // 이긴 경우 스테이지 회복까지 반영한 값
  won: boolean;
  log: BattleTurn[];
  // 계열 상성·환경을 적용한 전투에만 있다(enemyStats는 그 보정까지 반영한 값이다). 내 식구 계열을 모르면 없다.
  enemyFamily?: SpeciesFamily;
  rules?: BattleRulesView | null;
}

// 스테이지 한 판의 양쪽 능력치를 준비한다. 내 계열을 알면 적 계열과 전투 환경을 굴려서 상성·환경 보정을 곱한다(HP는 그대로).
function setUpSurvivalFight(
  hp: number,
  mine: { atk: number; def: number },
  rolledEnemy: CombatStats,
  myFamily: SpeciesFamily | undefined,
  random: () => number,
) {
  const myStats: CombatStats = { hp, atk: mine.atk, def: mine.def };
  if (!myFamily) return { myStats, enemyStats: rolledEnemy, enemyFamily: undefined, environmentId: undefined, rules: undefined };
  const enemyFamily = rollSurvivalEnemyFamily(random);
  // 환경은 야생 배틀과 같은 분포(평범 40%, 나머지 각 20%)로 스테이지마다 굴린다.
  const environmentId = rollWildEnvironment(random());
  const applied = applyBattleRules(myStats, rolledEnemy, myFamily, enemyFamily, environmentId);
  return { myStats: applied.mine, enemyStats: applied.enemy, enemyFamily, environmentId, rules: applied.rules };
}

export type SurvivalSegmentStatus = 'choose' | 'dead' | 'cleared';

// 마지막으로 깬 스테이지 다음부터 시작해서 "엘리트를 쓰러뜨려 선택이 필요해질 때", "내가 쓰러질 때", "상한에 도달할 때" 중
// 먼저 오는 곳까지 자동으로 진행한다.
export function playSurvivalSegment(
  start: SurvivalState,
  random: () => number = Math.random,
  myFamily?: SpeciesFamily,
): { state: SurvivalState; stages: SurvivalStageResult[]; status: SurvivalSegmentStatus } {
  const state: SurvivalState = { ...start, buffs: { ...start.buffs } };
  const stages: SurvivalStageResult[] = [];
  const mine = getSurvivalStats(state);

  for (let stage = state.stage + 1; stage <= SURVIVAL_MAX_STAGE; stage++) {
    const enemy = getSurvivalEnemy(stage);
    const hpBefore = state.hp;
    const fight = setUpSurvivalFight(hpBefore, mine, rollBossStats(enemy.stats, random), myFamily, random);
    const { winner, log } = simulateBossBattle(fight.myStats, fight.enemyStats, enemy.patterns, random);
    const base = {
      stage,
      isElite: enemy.isElite,
      patterns: enemy.patterns,
      enemyStats: fight.enemyStats,
      speciesRarity: enemy.speciesRarity,
      hpBefore,
      log,
      enemyFamily: fight.enemyFamily,
      rules: fight.rules,
    };
    if (winner !== 'me') {
      stages.push({ ...base, hpAfter: Math.max(0, myHpAfterBattle(log, hpBefore)), won: false });
      return { state, stages, status: 'dead' };
    }
    const healed = Math.min(
      mine.maxHp,
      myHpAfterBattle(log, hpBefore) + Math.round(mine.maxHp * mine.healRate),
    );
    state.hp = healed;
    state.stage = stage;
    stages.push({ ...base, hpAfter: healed, won: true });
    if (enemy.isElite && stage < SURVIVAL_MAX_STAGE) return { state, stages, status: 'choose' };
  }
  return { state, stages, status: 'cleared' };
}

// ---- 서바이벌 직접 전투 ----
// 직접 전투 모드의 런은 일반 스테이지를 자동으로 진행하다가 엘리트 앞에서 멈추고, 엘리트와는 매 턴 행동을 골라 싸운다
// (스테이지 수백 번을 일일이 고르면 지루해서 보스 패턴이 붙는 엘리트 전투만 직접 한다). 보상·회복·버프 선택은 자동 모드와 같다.
export type SurvivalMode = 'auto' | 'direct';
export const SURVIVAL_MODES: readonly SurvivalMode[] = ['auto', 'direct'];

// 마지막으로 깬 스테이지 다음부터 일반 스테이지를 자동으로 진행해서, 다음 엘리트 앞까지("elite") 또는 쓰러질 때까지("dead") 간다.
export function playSurvivalUntilElite(
  start: SurvivalState,
  random: () => number = Math.random,
  myFamily?: SpeciesFamily,
): { state: SurvivalState; stages: SurvivalStageResult[]; status: 'elite' | 'dead' } {
  const state: SurvivalState = { ...start, buffs: { ...start.buffs } };
  const stages: SurvivalStageResult[] = [];
  const mine = getSurvivalStats(state);

  for (let stage = state.stage + 1; stage <= SURVIVAL_MAX_STAGE; stage++) {
    const enemy = getSurvivalEnemy(stage);
    if (enemy.isElite) return { state, stages, status: 'elite' };
    const hpBefore = state.hp;
    const fight = setUpSurvivalFight(hpBefore, mine, rollBossStats(enemy.stats, random), myFamily, random);
    const { winner, log } = simulateBossBattle(fight.myStats, fight.enemyStats, enemy.patterns, random);
    const base = {
      stage,
      isElite: false,
      patterns: enemy.patterns,
      enemyStats: fight.enemyStats,
      speciesRarity: enemy.speciesRarity,
      hpBefore,
      log,
      enemyFamily: fight.enemyFamily,
      rules: fight.rules,
    };
    if (winner !== 'me') {
      stages.push({ ...base, hpAfter: Math.max(0, myHpAfterBattle(log, hpBefore)), won: false });
      return { state, stages, status: 'dead' };
    }
    const healed = Math.min(mine.maxHp, myHpAfterBattle(log, hpBefore) + Math.round(mine.maxHp * mine.healRate));
    state.hp = healed;
    state.stage = stage;
    stages.push({ ...base, hpAfter: healed, won: true });
  }
  // 상한(100스테이지)도 엘리트라서 여기까지 오지 않는다.
  return { state, stages, status: 'elite' };
}

// 다음 스테이지(엘리트)와의 직접 전투를 준비한다. 내 HP는 이어받은 현재 HP로 시작하고, 적 능력치는 자동 모드와 같이 한 번 굴린다.
export function startSurvivalEliteDuel(
  state: SurvivalState,
  random: () => number = Math.random,
  myFamily?: SpeciesFamily,
) {
  const stage = state.stage + 1;
  const enemy = getSurvivalEnemy(stage);
  const stats = getSurvivalStats(state);
  const fight = setUpSurvivalFight(state.hp, stats, rollBossStats(enemy.stats, random), myFamily, random);
  return {
    stage,
    patterns: enemy.patterns,
    speciesRarity: enemy.speciesRarity,
    enemyStats: fight.enemyStats,
    mine: fight.myStats,
    maxHp: stats.maxHp,
    enemyFamily: fight.enemyFamily,
    environmentId: fight.environmentId,
    rules: fight.rules,
    duelState: newBossDuelState(fight.myStats, fight.enemyStats),
  };
}

// 직접 전투로 엘리트를 이겼을 때의 새 상태. 자동 모드와 똑같이 스테이지를 깬 뒤 최대 HP의 회복 비율만큼 HP가 돌아온다.
export function finishSurvivalEliteWin(state: SurvivalState, hpAfterBattle: number): SurvivalState {
  const stats = getSurvivalStats(state);
  return {
    ...state,
    buffs: { ...state.buffs },
    stage: state.stage + 1,
    hp: Math.min(stats.maxHp, hpAfterBattle + Math.round(stats.maxHp * stats.healRate)),
  };
}

// ---- 계열 상성과 전투 환경 ----
// 계열끼리 상성이 있다: 불꽃은 숲을 태우고, 숲은 서리를 뚫고 자라며, 서리는 불꽃을 꺼뜨린다(불꽃 > 숲 > 서리 > 불꽃).
// 전투 환경은 한 계열을 편든다. 상성과 환경은 양쪽의 공격력·방어력에 곱해지는 보정으로 반영되고(HP는 그대로),
// 자동 전투와 직접 전투가 똑같이 받는다. 보정은 작아 보여도 접전에서 승부를 가른다(같은 전력일 때 유리 약 66% · 불리 약 35%).
export const FAMILY_BEATS: Record<SpeciesFamily, SpeciesFamily> = { fire: 'forest', forest: 'frost', frost: 'fire' };
export const FAMILY_MATCHUP_BONUS = 0.03; // 상성이 유리하면 +3%, 불리하면 −3%
export const ENVIRONMENT_BONUS = 0.03; // 환경이 편드는 계열은 +3%

export type BattleEnvironmentId = 'plain' | 'volcano' | 'jungle' | 'tundra';
export interface BattleEnvironmentInfo {
  id: BattleEnvironmentId;
  name: string;
  description: string;
  family: SpeciesFamily | null; // 이 환경이 편드는 계열(없으면 null)
}
export const BATTLE_ENVIRONMENTS: readonly BattleEnvironmentInfo[] = [
  { id: 'plain', name: '평범한 땅', description: '누구도 유리하지 않은 평범한 전장이에요.', family: null },
  {
    id: 'volcano',
    name: '화산 지대',
    description: `뜨거운 열기가 올라와 🔥 불꽃 계열이 공격·방어 +${Math.round(ENVIRONMENT_BONUS * 100)}%예요.`,
    family: 'fire',
  },
  {
    id: 'jungle',
    name: '울창한 숲',
    description: `촉촉한 숲의 기운으로 🌿 숲 계열이 공격·방어 +${Math.round(ENVIRONMENT_BONUS * 100)}%예요.`,
    family: 'forest',
  },
  {
    id: 'tundra',
    name: '서리 평원',
    description: `차가운 서리가 내려 ❄️ 서리 계열이 공격·방어 +${Math.round(ENVIRONMENT_BONUS * 100)}%예요.`,
    family: 'frost',
  },
];
export const BATTLE_ENVIRONMENT_BY_ID = new Map(BATTLE_ENVIRONMENTS.map((e) => [e.id, e]));

export type FamilyMatchup = 'advantage' | 'even' | 'disadvantage';

export function getFamilyMatchup(mine: SpeciesFamily, enemy: SpeciesFamily): FamilyMatchup {
  if (FAMILY_BEATS[mine] === enemy) return 'advantage';
  if (FAMILY_BEATS[enemy] === mine) return 'disadvantage';
  return 'even';
}

// 보스 타워 층의 환경: 층마다 정해져 있어서 미리 보고 식구를 고를 수 있다(평범 → 화산 → 숲 → 서리 순환).
const BOSS_ENVIRONMENT_CYCLE: readonly BattleEnvironmentId[] = ['plain', 'volcano', 'jungle', 'tundra'];
export function getBossEnvironment(floor: number): BattleEnvironmentId {
  return BOSS_ENVIRONMENT_CYCLE[(Math.max(1, floor) - 1) % BOSS_ENVIRONMENT_CYCLE.length];
}

// 야생 배틀과 서바이벌의 환경은 전투(스테이지)마다 무작위다(평범 40%, 나머지 셋이 20%씩).
export function rollWildEnvironment(random: number): BattleEnvironmentId {
  if (random < 0.4) return 'plain';
  if (random < 0.6) return 'volcano';
  if (random < 0.8) return 'jungle';
  return 'tundra';
}

// 이 전투에 적용되는 규칙(환경, 양쪽 계열, 상성, 최종 공격·방어 배율). 화면에 보여주는 용도이고, 능력치에 곱하는 건 applyBattleRules다.
export function describeBattleRules(
  myFamily: SpeciesFamily,
  enemyFamily: SpeciesFamily,
  environmentId: BattleEnvironmentId | null,
) {
  // null이면 환경이 없는 전투(서바이벌): 계열 상성만 적용된다.
  const environment = environmentId === null ? null : (BATTLE_ENVIRONMENT_BY_ID.get(environmentId) ?? BATTLE_ENVIRONMENTS[0]);
  const matchup = getFamilyMatchup(myFamily, enemyFamily);
  const matchupBonus = matchup === 'advantage' ? FAMILY_MATCHUP_BONUS : matchup === 'disadvantage' ? -FAMILY_MATCHUP_BONUS : 0;
  const multiplierOf = (family: SpeciesFamily, bonus: number) =>
    Math.round((1 + bonus + (environment?.family === family ? ENVIRONMENT_BONUS : 0)) * 100) / 100;
  return {
    environment,
    mine: { family: myFamily, matchup, multiplier: multiplierOf(myFamily, matchupBonus) },
    enemy: { family: enemyFamily, multiplier: multiplierOf(enemyFamily, -matchupBonus) },
  };
}
export type BattleRulesView = ReturnType<typeof describeBattleRules>;

// 양쪽 능력치에 상성·환경 보정(공격력·방어력)을 곱해서 돌려준다. 곱셈 결과는 소수 둘째 자리까지 유지한다
// (정수로 반올림하면 능력치가 작을 때 3% 보정이 사라진다). HP는 그대로다.
export function applyBattleRules(
  mine: CombatStats,
  enemy: CombatStats,
  myFamily: SpeciesFamily,
  enemyFamily: SpeciesFamily,
  environmentId: BattleEnvironmentId | null,
) {
  const rules = describeBattleRules(myFamily, enemyFamily, environmentId);
  return {
    mine: scaleStatsByMultiplier(mine, rules.mine.multiplier),
    enemy: scaleStatsByMultiplier(enemy, rules.enemy.multiplier),
    rules,
  };
}

// 공격력·방어력에 배율을 곱한다(HP는 그대로, 소수 둘째 자리까지 유지).
export function scaleStatsByMultiplier(s: CombatStats, multiplier: number): CombatStats {
  return {
    hp: s.hp,
    atk: Math.round(s.atk * multiplier * 100) / 100,
    def: Math.round(s.def * multiplier * 100) / 100,
  };
}

// 서바이벌 스테이지의 적 계열은 스테이지마다 무작위다(세 계열 같은 확률). 식구는 런 내내 한 마리라 미리 알아도 바꿀 수 없어서
// 정해 둘 필요가 없고, 확률이 같으니 어떤 계열의 식구로 들어가도 평균은 같다.
export function rollSurvivalEnemyFamily(random: () => number = Math.random): SpeciesFamily {
  return SPECIES_FAMILIES[Math.min(SPECIES_FAMILIES.length - 1, Math.floor(random() * SPECIES_FAMILIES.length))];
}

// ---- 전설·신화 번식의 긴 오프라인 인정 ----
// 시간 진행은 한 번에 MAX_ADVANCE_SECONDS(8시간)까지만 인정하지만, 번식 주기가 긴 전설·신화는 그보다 오래 자리를 비워도
// 계속 진행된다. 넘는 시간은 클라이언트가 보낸 값이 아니라 서버 시계로 잰 경과 시간(= 지금 - 마지막 틱)만 인정한다.
export const LONG_OFFLINE_BREED_MIN_RARITY = 3; // 전설(3) 이상만 해당

// 평소 상한을 넘는 자리 비움 시간 중 전설·신화 번식에만 더 인정하는 시간(초). 평소 틱(몇 초 간격)에서는 0이다.
// realElapsedSeconds: 서버 시계로 잰, 지난 틱 이후 흐른 시간. grantedSeconds: 이번에 평소대로 처리한 시간.
export function getLongOfflineBreedSeconds(realElapsedSeconds: number, grantedSeconds: number): number {
  if (!(realElapsedSeconds > MAX_ADVANCE_SECONDS)) return 0;
  return Math.max(0, realElapsedSeconds - grantedSeconds);
}

// 한 사육장의 한 종 번식을 seconds만큼 한꺼번에 진행한다. 태어난 수와 남은 진행도를 돌려준다.
// 자리가 모자라 다 낳지 못하면 진행도는 주기에서 멈춘다(자리가 나면 바로 태어난다 — 평소 계산과 같다).
export function advanceBreeding(
  currentProgress: number,
  seconds: number,
  limit: number,
  capacityLeft: number,
): { births: number; progress: number } {
  const progress = currentProgress + seconds;
  const possible = Math.floor(progress / limit);
  const births = Math.max(0, Math.min(possible, capacityLeft));
  return { births, progress: births < possible ? limit : progress - births * limit };
}

// ---- 고급 탐색(원정) ----
// 숲 탐색 비용의 몇십 배를 내고 에픽 이상(대원정은 전설 이상)을 확정으로 만난다. 신화는 연속으로 못 만나면 확정이고,
// 아직 도감에 없는 종이 그 등급에 남아 있으면 그중에서 먼저 나온다. 가격은 지금의 숲 탐색 비용에 정확히 배수만큼 곱한 값이다.
export interface ExpeditionTier {
  tier: number;
  name: string;
  multiplier: number; // 지금의 숲 탐색 비용에 곱한다
  odds: { rarity: number; percent: number }[]; // 합계 100
}
export const EXPEDITION_TIERS: readonly ExpeditionTier[] = [
  {
    tier: 1,
    name: '원정',
    multiplier: 40,
    odds: [
      { rarity: 2, percent: 80 },
      { rarity: 3, percent: 17 },
      { rarity: 4, percent: 3 },
    ],
  },
  {
    tier: 2,
    name: '대원정',
    multiplier: 150,
    odds: [
      { rarity: 3, percent: 80 },
      { rarity: 4, percent: 20 },
    ],
  },
];
export const EXPEDITION_PITY_LIMIT = 30; // 신화가 이만큼 연속으로 안 나오면 이번 원정은 신화 확정(단계와 무관하게 센다)

export function getExpeditionTier(tier: number): ExpeditionTier | undefined {
  return EXPEDITION_TIERS.find((t) => t.tier === tier);
}

export function getExpeditionPrice(tier: ExpeditionTier, exploreCostSteps: number): number {
  return tier.multiplier * getExploreCost(exploreCostSteps);
}

// 확률표대로 희귀도를 뽑는다. random은 0 이상 1 미만.
export function rollExpeditionRarity(tier: ExpeditionTier, random: number): number {
  let r = random * 100;
  for (const o of tier.odds) {
    if (r < o.percent) return o.rarity;
    r -= o.percent;
  }
  return tier.odds[tier.odds.length - 1].rarity;
}

// 뽑힌 등급에서 종을 고른다. 아직 도감에 없는 종이 있으면 그중에서 먼저 고른다.
export function pickExpeditionSpecies(
  speciesList: Species[],
  rarity: number,
  discovered: readonly string[],
  random: number,
): Species | null {
  const pool = speciesList.filter((s) => s.rarity === rarity);
  if (pool.length === 0) return null;
  const fresh = pool.filter((s) => !discovered.includes(s.speciesId));
  const from = fresh.length > 0 ? fresh : pool;
  return from[Math.min(from.length - 1, Math.floor(random * from.length))];
}

// ---- 부스트 상점 ----
// 골드로 일정 시간 동안 수익·번식·전투 경험치를 2배로 만든다. 부스트는 {kind, from, until} 시간대로 저장하고,
// 시간이 흐르는 계산(advance)은 처리하는 구간과 겹친 부분에만 배율을 적용한다.
export type BoostKind = 'income' | 'breed' | 'battleXp';
export const BOOST_KINDS: readonly BoostKind[] = ['income', 'breed', 'battleXp'];
export const BOOST_MULTIPLIER = 2;
// 살 수 있는 길이. 4시간짜리는 1시간짜리 4개보다 10% 싸다.
export const BOOST_OFFERS: readonly { hours: number; discount: number }[] = [
  { hours: 1, discount: 1 },
  { hours: 4, discount: 0.9 },
];
export const BOOST_MAX_STACK_HOURS = 24; // 남은 시간이 이만큼 넘게는 쌓을 수 없다
// 1시간 가격 = (계정의 시간당 최대 수익) × 이 비율. 번식·경험치는 수익과 같은 값, 수익 부스트는 15% 싸다(손익은 거의 같다).
export const BOOST_PRICE_RATE: Record<BoostKind, number> = { income: 0.85, breed: 1, battleXp: 1 };
export const BOOST_MIN_PRICE_PER_HOUR = 1000;

export interface BoostWindow {
  kind: string;
  from: number;
  until: number;
}

export const BOOST_INFO: readonly { kind: BoostKind; name: string; description: string }[] = [
  { kind: 'income', name: '수익 부스트', description: `자동 수익이 ${BOOST_MULTIPLIER}배가 돼요.` },
  { kind: 'breed', name: '번식 촉진', description: `번식 진행이 ${BOOST_MULTIPLIER}배 빨라져요.` },
  { kind: 'battleXp', name: '전투 경험치 부스트', description: `전투·훈련·보스·서바이벌 경험치가 ${BOOST_MULTIPLIER}배가 돼요.` },
];

// 시간당 가격. 계정의 시간당 최대 수익(쾌적한 환경 기준)에 비례하고, 아무리 작아도 1시간에 1,000 G는 받는다.
export function getBoostPrice(kind: BoostKind, hours: number, hourlyIncome: number): number {
  const offer = BOOST_OFFERS.find((o) => o.hours === hours);
  if (!offer) return NaN;
  const perHour = Math.max(BOOST_MIN_PRICE_PER_HOUR, hourlyIncome * BOOST_PRICE_RATE[kind]);
  return Math.round((perHour * hours * offer.discount) / 10) * 10;
}

// [startMs, endMs] 구간에서 부스트가 켜져 있던 비율만큼 평균 배율을 돌려준다(전부 켜져 있으면 2, 없으면 1).
export function getBoostFactor(boosts: readonly BoostWindow[], kind: BoostKind, startMs: number, endMs: number): number {
  const span = endMs - startMs;
  if (span <= 0) return 1;
  let covered = 0;
  for (const b of boosts) {
    if (b.kind !== kind) continue;
    covered += Math.max(0, Math.min(endMs, b.until) - Math.max(startMs, b.from));
  }
  return 1 + (BOOST_MULTIPLIER - 1) * Math.min(1, covered / span);
}

// ---- 업적 진행도 계산 ----
// 프론트(gameCalc.ts)에도 같은 함수가 있다. 값을 바꿀 땐 두 곳을 함께 고쳐야 한다.
export interface AchievementProgressInput {
  type: 'stat' | 'collectionRarity' | 'collectionAll';
  statKey?:
    | 'births'
    | 'sold'
    | 'explored'
    | 'earned'
    | 'discovered'
    | 'terrariums'
    | 'battlesWon'
    | 'pvpWins'
    | 'peakPvpRating'
    | 'trainCount'
    | 'highestBattleLevel'
    | 'friendsCount'
    | 'nicknames'
    | 'equipmentPulls'
    | 'equipmentOwned'
    | 'legendEquipment'
    | 'mythicEquipment'
    | 'equipmentLevel'
    | 'equipmentAwakenings'
    | 'equipmentSlots'
    | 'highestBossFloor'
    | 'bossWins'
    | 'bestPvpWinStreak'
    | 'highestSurvivalStage';
  target?: number;
  rarity?: number;
}

export interface AchievementSubject {
  discovered: string[];
  terrariumCount: number;
  friendsCount: number;
  nicknamesCount: number;
  equipment: EquipmentSummary;
  stats: {
    births: number;
    sold: number;
    explored: number;
    earned: number;
    battlesWon: number;
    pvpWins: number;
    peakPvpRating: number;
    trainCount: number;
    highestBattleLevel: number;
    equipmentPulls: number;
    highestBossFloor: number;
    // 보스 타워 난이도별로 깬 최고 층(쉬움은 highestBossFloor). 예전 데이터에는 없을 수 있다.
    bossFloorNormal?: number;
    bossFloorHard?: number;
    bossFloorExtreme?: number;
    bossWins: number;
    bestPvpWinStreak: number;
    highestSurvivalStage?: number; // 서바이벌 최고 스테이지(예전 데이터에는 없을 수 있다)
  };
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
    case 'friendsCount':
      return { progress: subject.friendsCount, target };
    case 'nicknames':
      return { progress: subject.nicknamesCount, target };
    case 'equipmentOwned':
      return { progress: subject.equipment.owned, target };
    case 'legendEquipment':
      return { progress: subject.equipment.legend, target };
    case 'mythicEquipment':
      return { progress: subject.equipment.mythic, target };
    case 'equipmentLevel':
      return { progress: subject.equipment.maxLevel, target };
    case 'equipmentAwakenings':
      return { progress: subject.equipment.awakenings, target };
    case 'equipmentSlots':
      return { progress: subject.equipment.slots, target };
    case 'highestBossFloor':
      // 어느 난이도에서든 깬 가장 높은 층
      return { progress: getBestBossFloor(subject.stats), target };
    case 'births':
    case 'sold':
    case 'explored':
    case 'earned':
    case 'battlesWon':
    case 'pvpWins':
    case 'peakPvpRating':
    case 'trainCount':
    case 'highestBattleLevel':
    case 'equipmentPulls':
    case 'bossWins':
    case 'bestPvpWinStreak':
      return { progress: subject.stats[achievement.statKey], target };
    case 'highestSurvivalStage':
      return { progress: subject.stats.highestSurvivalStage ?? 0, target };
    default:
      return { progress: 0, target };
  }
}
