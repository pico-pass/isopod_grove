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
export const TRAIN_EXTREME_DIAMOND_COST = 1;
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
export const PVP_WIN_COIN_REWARD = 120;
export const PVP_WIN_DIAMOND_CHANCE = 0.08;
export const PVP_WIN_SPECIES_XP = 30;
export const PVP_WIN_ACCOUNT_XP = 20;
export const PVP_LOSE_ACCOUNT_XP = 3;
// 종(콩벌레) 별명: 나에게만 보이는 표시용 이름. 무료이며 언제든 바꾸거나 되돌릴 수 있다.
export const SPECIES_NICKNAME_MAX_LENGTH = 10;

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
): CombatStats {
  const base = getCombatBaseStats(rarity, level);
  const vary = (v: number) => Math.max(1, Math.round(v * (1 - BATTLE_STAT_VARIANCE + random() * BATTLE_STAT_VARIANCE * 2)));
  return { hp: vary(base.hp), atk: vary(base.atk), def: vary(base.def) };
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
