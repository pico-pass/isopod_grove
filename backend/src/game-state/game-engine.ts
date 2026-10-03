import { Species } from '../species/schemas/species.schema';
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
// 희귀도(일반~신화)별 번식 주기(초): 5분 / 20분 / 60분 / 4시간 / 10시간마다 +1마리
export const BREED_SECONDS_BY_RARITY = [300, 1200, 3600, 14400, 36000];
export const MAX_TERRARIUMS = 10;
export const TERRARIUM_BASE_COST = 2500;
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
export const EQUIPMENT_SLOT_EXPAND_COSTS = [500, 1250]; // 4번째, 5번째 슬롯 확장 비용(다이아)
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
  for (const itemId of slots ?? []) {
    if (!itemId || used.has(itemId)) continue;
    used.add(itemId);
    const def = EQUIPMENT_BY_ID.get(itemId);
    const state = (items ?? []).find((i) => i.itemId === itemId);
    if (!def || !state) continue;
    result[EQUIPMENT_STAT_BY_CATEGORY[def.category]] +=
      getEquipmentBonus(def.rarity, state.level, state.awakenCount) * rate;
  }
  return result;
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
    | 'bestPvpWinStreak';
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
    default:
      return { progress: 0, target };
  }
}
