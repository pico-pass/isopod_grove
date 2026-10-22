import {
  BOSS_BASE_STATS,
  SURVIVAL_STAGE_GROWTH,
  rollWildEnvironment,
  type BattleEnvironmentId,
  type BossPattern,
  type CombatStats,
} from './game-engine';
import { SPECIES_FAMILIES, type SpeciesFamily } from '../species/species.family';

// ---- 썩은 통나무 던전(로그라이크) ----
// 식구 한 마리로 100층을 올라간다. 층마다 방 2~3개 중 하나를 골라 들어가고(전투·엘리트·휴식·상점·이벤트·보물),
// 이기면 유물을 얻어 빌드를 키운다. 10층 단위의 한 "장"마다 5층은 엘리트, 10층은 보스이고, 100층 보스를 쓰러뜨리면 완주다.
// 전투는 서바이벌과 같은 전투 엔진을 쓴다(일반 전투는 자동, 엘리트·보스는 매 턴 행동을 고르는 직접 전투).
// 지면 런이 끝나고 깬 층만큼 보상을 받는다. 방·유물 제안·상점·이벤트는 런 시드(와 층 번호)로 정해서 새로고침해도 바뀌지 않는다.
export const DUNGEON_FLOORS = 100;
export const DUNGEON_CHAPTER = 10; // 10층마다 한 장: 5층 엘리트, 10층 보스
export const isDungeonBossFloor = (floor: number): boolean => floor > 0 && floor % DUNGEON_CHAPTER === 0;
export const isDungeonEliteFloor = (floor: number): boolean => floor > 0 && floor % DUNGEON_CHAPTER === DUNGEON_CHAPTER / 2;
export const DUNGEON_CHAPTER_BONUS = 0.04; // 장 보스를 쓰러뜨릴 때마다 공격·방어·최대 HP +4%(런 내내)
export const DUNGEON_BOSS_HEAL_RATE = 0.5; // 장 보스를 이기면 최대 HP의 50% 회복
export const DUNGEON_BATTLE_RELIC_CHANCE = 0.6; // 일반 전투를 이겼을 때 유물 제안이 나올 확률(아니면 버섯조각을 더 얻는다)
export const DUNGEON_BATTLE_EXTRA_GOLD = 20;
export const DUNGEON_DAILY_RUNS = 3;
export const DUNGEON_ROOM_CHOICES = 3;
export const DUNGEON_OFFER_COUNT = 3; // 유물 제안 개수(네잎클로버가 있으면 +1)
export const DUNGEON_BASE_HEAL_RATE = 0.1; // 전투를 이길 때마다 최대 HP의 10% 회복
export const DUNGEON_REST_HEAL_RATE = 0.35; // 휴식으로 최대 HP의 35% 회복
export const DUNGEON_BUILD_MULT = 1.82; // 유물·단련으로 늘어나는 공격·방어·최대 HP 효과에 곱한다(1.3 × 1.4). 이벤트·장 보스 보너스, 줄어드는 효과(유리 송곳니의 HP 감소)는 그대로
export const DUNGEON_TRAIN_BONUS = Math.round(0.06 * DUNGEON_BUILD_MULT * 10000) / 10000; // 단련: 고른 능력치 +10.92%(런 내내)
// 유물 설명에 쓰는 "곱한 뒤의 퍼센트" 글자(0.12 → '21.84')
const boostedPct = (v: number): string => String(Math.round(v * DUNGEON_BUILD_MULT * 10000) / 100);
export const DUNGEON_SKIP_GOLD = 30; // 유물을 고르지 않고 넘기면 받는 버섯조각
export const DUNGEON_POTION_PRICE = 45;
export const DUNGEON_POTION_HEAL_RATE = 0.4;
export const DUNGEON_REVIVE_HP_RATE = 0.5;
export const DUNGEON_RELIC_PRICE: readonly number[] = [70, 130, 240]; // 상점 유물 가격(일반·희귀·에픽, 버섯조각)

export type DungeonRoomType = 'battle' | 'elite' | 'rest' | 'shop' | 'event' | 'treasure' | 'boss';
export interface DungeonRoom {
  type: DungeonRoomType;
  // 전투·엘리트·보스 방은 적 계열과 환경을 미리 보여 준다(상성·환경을 보고 고를 수 있다)
  family?: SpeciesFamily;
  environment?: BattleEnvironmentId;
}

export const DUNGEON_ROOM_INFO: Record<DungeonRoomType, { name: string; icon: string; description: string }> = {
  battle: { name: '전투', icon: '⚔️', description: '적과 싸워요. 이기면 유물을 고를 수 있어요.' },
  elite: { name: '엘리트', icon: '💀', description: '보스 패턴이 있는 강한 적이에요. 직접 싸우고, 이기면 좋은 유물이 나와요.' },
  rest: { name: '휴식처', icon: '🏕️', description: '쉬어서 HP를 채우거나, 능력치 하나를 단련해요.' },
  shop: { name: '상점', icon: '🛒', description: '버섯조각으로 유물이나 회복약을 사요.' },
  event: { name: '이벤트', icon: '❓', description: '무슨 일이 벌어질지 몰라요. 선택에 따라 달라져요.' },
  treasure: { name: '보물', icon: '💎', description: '싸우지 않고 좋은 유물 하나를 골라요.' },
  boss: { name: '보스', icon: '👑', description: '던전의 주인이에요. 이기면 완주예요.' },
};

// ---- 난수 ----
// 런 시드와 층·용도 번호를 섞어서 같은 값이 항상 같은 난수열을 만들게 한다.
export function seededRandom(seed: number, ...salts: number[]): () => number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (const s of salts) {
    h = Math.imul(h ^ (s + 0x7f4a7c15), 0x85ebca6b) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 방 ----
const ROOM_WEIGHTS: Record<'battle' | 'elite' | 'event' | 'shop' | 'rest' | 'treasure', number> = {
  battle: 38,
  elite: 10,
  event: 16,
  shop: 12,
  rest: 12,
  treasure: 12,
};

function pickType(random: () => number, pool: readonly DungeonRoomType[]): DungeonRoomType {
  const total = pool.reduce((sum, t) => sum + ROOM_WEIGHTS[t as keyof typeof ROOM_WEIGHTS], 0);
  let r = random() * total;
  for (const t of pool) {
    r -= ROOM_WEIGHTS[t as keyof typeof ROOM_WEIGHTS];
    if (r < 0) return t;
  }
  return pool[pool.length - 1];
}

// 이 층에서 고를 수 있는 방. 한 장의 5층은 엘리트, 10층은 보스 하나뿐이다. 1층에는 상점·휴식·엘리트가 없고,
// 한 장의 4·9층(엘리트·보스 바로 앞)에는 휴식처가 반드시 하나 있다. 같은 종류의 방은 한 층에 둘 나오지 않는다.
export function generateRoomOptions(seed: number, floor: number): DungeonRoom[] {
  const random = seededRandom(seed, floor, 1);
  const withEnemy = (type: DungeonRoomType): DungeonRoom => {
    const family = SPECIES_FAMILIES[Math.floor(random() * SPECIES_FAMILIES.length)];
    return { type, family, environment: rollWildEnvironment(random()) };
  };
  if (isDungeonEliteFloor(floor)) return [withEnemy('elite')];
  if (isDungeonBossFloor(floor) || floor >= DUNGEON_FLOORS) return [withEnemy('boss')];
  let pool: DungeonRoomType[] = ['battle', 'elite', 'event', 'shop', 'rest', 'treasure'];
  if (floor === 1) pool = ['battle', 'event', 'treasure'];
  const types: DungeonRoomType[] = [];
  if (floor % DUNGEON_CHAPTER === DUNGEON_CHAPTER / 2 - 1 || floor % DUNGEON_CHAPTER === DUNGEON_CHAPTER - 1) {
    types.push('rest');
    pool = pool.filter((t) => t !== 'rest');
  }
  while (types.length < DUNGEON_ROOM_CHOICES && pool.length > 0) {
    const t = pickType(random, pool);
    types.push(t);
    pool = pool.filter((p) => p !== t);
  }
  // 휴식처가 항상 맨 앞에 오지 않게 섞는다
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types.map((t) => (t === 'battle' || t === 'elite' ? withEnemy(t) : { type: t }));
}

// ---- 적 ----
// 적 능력치(공격·방어·HP 모두 같은 비율): 1층의 일반 적은 서바이벌 startStage 스테이지의 적과 같고(`기본 × 1.08^(startStage-1)`),
// 층이 하나 오를 때마다 모든 난이도에서 똑같이 6.5%씩(복리) 늘어난다. 그 층의 엘리트는 그 층 일반 적의 1.4배, 보스는 1.8배다.
// 난이도끼리는 1층의 시작 강함(startStage)과 보상 배율만 다르다. 식구의 힘(희귀도·레벨·장비)이 크게 달라서 난이도를 골라 입장한다.
export type DungeonDifficultyId = 'easy' | 'normal' | 'hard' | 'harder' | 'extreme';
export const DUNGEON_DIFFICULTIES: readonly { id: DungeonDifficultyId; name: string; startStage: number; rewardMult: number }[] = [
  { id: 'easy', name: '쉬움', startStage: 3, rewardMult: 1 },
  { id: 'normal', name: '보통', startStage: 4, rewardMult: 1.5 },
  { id: 'hard', name: '어려움', startStage: 6, rewardMult: 2 },
  { id: 'harder', name: '매우 어려움', startStage: 8, rewardMult: 3 },
  { id: 'extreme', name: '지옥', startStage: 10, rewardMult: 4 },
];
export const DUNGEON_DIFFICULTY_IDS: readonly DungeonDifficultyId[] = DUNGEON_DIFFICULTIES.map((d) => d.id);
export const findDungeonDifficulty = (id: string) => DUNGEON_DIFFICULTIES.find((d) => d.id === id);
export const DUNGEON_FLOOR_GROWTH = 1.065; // 층이 오를 때마다 적 능력치가 6.5%씩(복리) 늘어난다. 모든 난이도 공통
export const DUNGEON_ELITE_MULT = 1.4; // 엘리트 = 그 층 일반 적의 1.4배(공격·방어·HP 모두)
export const DUNGEON_BOSS_MULT = 1.8; // 보스 = 그 층 일반 적의 1.8배(공격·방어·HP 모두)

// 이 난이도·층의 일반 적이 서바이벌 몇 스테이지에 해당하는지(소수). 서바이벌은 스테이지마다 8%, 던전은 층마다 6.5%라서 층당 약 0.82스테이지씩 오른다.
export function getDungeonEnemyStage(difficulty: DungeonDifficultyId, floor: number): number {
  const d = findDungeonDifficulty(difficulty) ?? DUNGEON_DIFFICULTIES[0];
  const f = Math.max(1, Math.min(DUNGEON_FLOORS, floor));
  return d.startStage + ((f - 1) * Math.log(DUNGEON_FLOOR_GROWTH)) / Math.log(SURVIVAL_STAGE_GROWTH);
}
const DUNGEON_PATTERN_ORDER: readonly BossPattern[] = ['guard', 'regen', 'heavy', 'enrage', 'thorns'];

export interface DungeonEnemy {
  floor: number;
  isElite: boolean;
  isBoss: boolean;
  stats: CombatStats;
  patterns: BossPattern[];
  speciesRarity: number;
}

export function getDungeonEnemy(
  seed: number,
  floor: number,
  type: 'battle' | 'elite' | 'boss',
  difficulty: DungeonDifficultyId = 'easy',
): DungeonEnemy {
  const d = findDungeonDifficulty(difficulty) ?? DUNGEON_DIFFICULTIES[0];
  const f = Math.max(1, Math.min(DUNGEON_FLOORS, floor));
  const growth = Math.pow(SURVIVAL_STAGE_GROWTH, d.startStage - 1) * Math.pow(DUNGEON_FLOOR_GROWTH, f - 1);
  const strong = type !== 'battle';
  const typeMult = type === 'boss' ? DUNGEON_BOSS_MULT : type === 'elite' ? DUNGEON_ELITE_MULT : 1;
  const stat = (k: keyof CombatStats) => Math.max(1, Math.round(BOSS_BASE_STATS[k] * growth * typeMult));
  const random = seededRandom(seed, floor, 2);
  // 엘리트는 패턴 1개(55층부터 2개), 보스는 2개(60층부터 3개). 같은 패턴이 겹치지 않는다.
  const patternCount = type === 'boss' ? (floor >= 60 ? 3 : 2) : type === 'elite' ? (floor >= 55 ? 2 : 1) : 0;
  const patterns: BossPattern[] = [];
  const first = Math.floor(random() * DUNGEON_PATTERN_ORDER.length);
  for (let i = 0; i < patternCount; i++) patterns.push(DUNGEON_PATTERN_ORDER[(first + 2 * i) % DUNGEON_PATTERN_ORDER.length]);
  return {
    floor,
    isElite: type === 'elite',
    isBoss: type === 'boss',
    stats: { hp: stat('hp'), atk: stat('atk'), def: stat('def') },
    patterns,
    // 화면에 보일 종의 희귀도(능력치와는 별개). 엘리트·보스는 한 단계 위로 보여 준다.
    speciesRarity: Math.min(4, Math.floor((floor - 1) / 20) + (strong ? 1 : 0)),
  };
}

// ---- 유물 ----
export interface DungeonRelicEffects {
  atk?: number; // 공격력 +비율
  def?: number;
  hp?: number; // 최대 HP +비율(음수면 줄어든다)
  postHeal?: number; // 전투를 이길 때마다 추가로 회복하는 비율(최대 HP 기준)
  gold?: number; // 버섯조각 획득 +비율
  shopDiscount?: number; // 상점 가격 −비율
  restBonus?: number; // 휴식 회복량 +비율p
  skillCd?: number; // 계열 기술의 쉬는 시간 −턴(직접 전투)
  revive?: boolean; // 쓰러지면 한 번 되살아난다
  offerExtra?: number; // 유물 제안 +개
}

export interface DungeonRelic {
  relicId: string;
  name: string;
  icon: string;
  tier: 0 | 1 | 2; // 일반 / 희귀 / 에픽
  description: string;
  effects: DungeonRelicEffects;
  maxStacks: number; // 같은 유물을 겹쳐서 가질 수 있는 최대 개수(효과가 개수만큼 쌓인다)
}

const relic = (
  relicId: string,
  name: string,
  icon: string,
  tier: 0 | 1 | 2,
  description: string,
  effects: DungeonRelicEffects,
  maxStacks = 1,
): DungeonRelic => ({
  relicId,
  name,
  icon,
  tier,
  description,
  effects,
  maxStacks,
});

export const DUNGEON_RELICS: readonly DungeonRelic[] = [
  relic('sharp-antenna', '날카로운 더듬이', '📡', 0, `공격력 +${boostedPct(0.12)}%`, { atk: 0.12 }, 3),
  relic('hard-shell', '단단한 등딱지', '🛡️', 0, `방어력 +${boostedPct(0.15)}%`, { def: 0.15 }, 3),
  relic('thick-body', '두툼한 몸통', '🫧', 0, `최대 HP +${boostedPct(0.15)}%`, { hp: 0.15 }, 3),
  relic('moss-pad', '이끼 방석', '🌿', 0, '전투를 이길 때마다 HP 4% 추가 회복', { postHeal: 0.04 }, 3),
  relic('gold-berry', '황금 열매', '🍒', 0, '버섯조각을 40% 더 얻어요', { gold: 0.4 }, 2),
  relic('fang-charm', '송곳니 부적', '🦷', 1, `공격력 +${boostedPct(0.2)}%`, { atk: 0.2 }, 2),
  relic('iron-plate', '쇠 등껍질', '⚙️', 1, `방어력 +${boostedPct(0.25)}%`, { def: 0.25 }, 2),
  relic('sturdy-root', '튼튼한 뿌리', '🌱', 1, `최대 HP +${boostedPct(0.25)}%`, { hp: 0.25 }, 2),
  relic('healing-spring', '치유의 샘물', '💧', 1, '전투를 이길 때마다 HP 8% 추가 회복', { postHeal: 0.08 }, 2),
  relic('merchant-badge', '상인의 휘장', '🏷️', 1, '상점 가격 30% 할인', { shopDiscount: 0.3 }),
  relic('soft-bedding', '포근한 잠자리', '🛏️', 1, '휴식 회복량 +15%p', { restBonus: 0.15 }, 2),
  relic('family-sigil', '계열의 증표', '🔱', 1, '계열 기술의 쉬는 시간 1턴 감소', { skillCd: 1 }, 2),
  relic('lion-heart', '사자의 심장', '🦁', 2, `공격력 +${boostedPct(0.15)}%, 최대 HP +${boostedPct(0.15)}%`, { atk: 0.15, hp: 0.15 }, 2),
  relic('second-shell', '두 번째 껍질', '🐚', 2, '쓰러지면 한 번 HP 50%로 되살아나요', { revive: true }),
  relic('ancient-fossil', '오래된 화석', '🦴', 2, `공격력·방어력·최대 HP 각각 +${boostedPct(0.1)}%`, { atk: 0.1, def: 0.1, hp: 0.1 }, 2),
  relic('lucky-clover', '네잎클로버', '🍀', 2, '유물 제안이 하나 더 늘어나요', { offerExtra: 1 }),
  relic('glass-fang', '유리 송곳니', '🔮', 2, `공격력 +${boostedPct(0.4)}%, 최대 HP −15%`, { atk: 0.4, hp: -0.15 }),
];

const RELIC_BY_ID = new Map(DUNGEON_RELICS.map((r) => [r.relicId, r]));
export const findRelic = (relicId: string): DungeonRelic | undefined => RELIC_BY_ID.get(relicId);

export interface DungeonBonus {
  atk: number;
  def: number;
  hp: number;
}

export interface DungeonRunStatsInput {
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  relics: readonly string[];
  bonus?: Partial<DungeonBonus> | null;
}

export interface DungeonStats {
  maxHp: number;
  atk: number;
  def: number;
  postHeal: number; // 전투 후 회복 비율(기본 + 유물)
  goldMult: number;
  shopDiscount: number;
  restBonus: number;
  skillCd: number;
  hasRevive: boolean;
  offerCount: number;
}

// 유물 id별 가진 개수(최대 겹침 수를 넘는 것은 세지 않는다)
export function countRelics(relics: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of relics) {
    const r = findRelic(id);
    if (!r) continue;
    const n = counts.get(id) ?? 0;
    if (n < r.maxStacks) counts.set(id, n + 1);
  }
  return counts;
}

// 유물과 런 중 단련·이벤트·장 보너스를 합친 지금 능력치. 겹칠 수 있는 유물은 개수만큼 효과가 쌓인다.
export function getDungeonStats(run: DungeonRunStatsInput): DungeonStats {
  const t = { atk: 0, def: 0, hp: 0, postHeal: 0, gold: 0, shopDiscount: 0, restBonus: 0, skillCd: 0, offerExtra: 0, revive: false };
  for (const [id, n] of countRelics(run.relics)) {
    const r = findRelic(id);
    if (!r) continue;
    const e = r.effects;
    const k = (v: number | undefined) => (v ?? 0) * n;
    // 늘어나는 능력치만 DUNGEON_BUILD_MULT배(줄어드는 효과는 그대로)
    const boost = (v: number | undefined) => ((v ?? 0) > 0 ? (v as number) * DUNGEON_BUILD_MULT : v);
    t.atk += k(boost(e.atk));
    t.def += k(boost(e.def));
    t.hp += k(boost(e.hp));
    t.postHeal += k(e.postHeal);
    t.gold += k(e.gold);
    t.shopDiscount += k(e.shopDiscount);
    t.restBonus += k(e.restBonus);
    t.skillCd += k(e.skillCd);
    t.offerExtra += k(e.offerExtra);
    if (e.revive) t.revive = true;
  }
  const b = run.bonus ?? {};
  return {
    maxHp: Math.max(1, Math.round(run.baseHp * (1 + t.hp + (b.hp ?? 0)))),
    atk: Math.max(1, Math.round(run.baseAtk * (1 + t.atk + (b.atk ?? 0)))),
    def: Math.max(1, Math.round(run.baseDef * (1 + t.def + (b.def ?? 0)))),
    postHeal: DUNGEON_BASE_HEAL_RATE + t.postHeal,
    goldMult: 1 + t.gold,
    shopDiscount: Math.min(0.9, t.shopDiscount),
    restBonus: t.restBonus,
    skillCd: t.skillCd,
    hasRevive: t.revive,
    offerCount: DUNGEON_OFFER_COUNT + t.offerExtra,
  };
}

// 유물 제안 등급 확률(일반·희귀·에픽, 합계 100)
export type DungeonOfferKind = 'battle' | 'elite' | 'boss' | 'treasure' | 'event' | 'shop';
export const DUNGEON_OFFER_ODDS: Record<DungeonOfferKind, readonly number[]> = {
  battle: [60, 33, 7],
  boss: [0, 40, 60],
  elite: [20, 55, 25],
  treasure: [0, 60, 40],
  event: [30, 50, 20],
  shop: [30, 50, 20],
};

// 더 겹쳐 가질 수 있는 유물 중에서 count개를 등급 확률로 뽑는다(없는 등급은 다른 등급으로 대신한다). 같은 시드·층·용도면 같은 결과다.
export function rollRelicOffer(
  random: () => number,
  owned: readonly string[],
  kind: DungeonOfferKind,
  count: number,
): string[] {
  const have = countRelics(owned);
  const pools: DungeonRelic[][] = [0, 1, 2].map((tier) =>
    DUNGEON_RELICS.filter((r) => r.tier === tier && (have.get(r.relicId) ?? 0) < r.maxStacks),
  );
  const odds = DUNGEON_OFFER_ODDS[kind];
  const picked: string[] = [];
  for (let n = 0; n < count; n++) {
    const remaining = pools.reduce((s, p) => s + p.length, 0);
    if (remaining === 0) break;
    let r = random() * 100;
    let tier = 0;
    for (let i = 0; i < odds.length; i++) {
      if (r < odds[i]) {
        tier = i;
        break;
      }
      r -= odds[i];
      tier = i;
    }
    // 그 등급이 비었으면 가까운 등급에서 고른다
    if (pools[tier].length === 0) {
      const order = [tier, tier + 1, tier - 1, tier + 2, tier - 2].filter((t) => t >= 0 && t <= 2 && pools[t].length > 0);
      tier = order[0];
    }
    const pool = pools[tier];
    const idx = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    picked.push(pool[idx].relicId);
    pool.splice(idx, 1);
  }
  return picked;
}

// ---- 상점 ----
export interface DungeonShopStock {
  relics: { relicId: string; price: number }[];
  potionPrice: number;
}

export function rollShop(seed: number, floor: number, owned: readonly string[], discount: number): DungeonShopStock {
  const random = seededRandom(seed, floor, 4);
  const ids = rollRelicOffer(random, owned, 'shop', 3);
  const price = (base: number) => Math.max(1, Math.round(base * (1 - discount)));
  return {
    relics: ids.map((id) => ({ relicId: id, price: price(DUNGEON_RELIC_PRICE[findRelic(id)?.tier ?? 0]) })),
    potionPrice: price(DUNGEON_POTION_PRICE),
  };
}

// ---- 이벤트 ----
export interface DungeonEventChoice {
  id: string;
  label: string;
  hint: string;
}
export interface DungeonEvent {
  eventId: string;
  title: string;
  icon: string;
  text: string;
  choices: DungeonEventChoice[];
}

export const DUNGEON_EVENTS: readonly DungeonEvent[] = [
  {
    eventId: 'mystery-mushroom',
    title: '수상한 버섯',
    icon: '🍄',
    text: '통나무 틈에 처음 보는 버섯이 자라 있어요. 향이 좋은데… 먹어도 될까요?',
    choices: [
      { id: 'eat', label: '먹는다', hint: '60% HP +30% / 40% HP −15%' },
      { id: 'leave', label: '지나간다', hint: '아무 일도 없어요' },
    ],
  },
  {
    eventId: 'old-altar',
    title: '낡은 제단',
    icon: '🗿',
    text: '이끼 낀 제단이 서 있어요. 무언가를 바치면 힘을 줄 것 같아요.',
    choices: [
      { id: 'blood', label: '체력을 바친다', hint: 'HP −20%, 공격력 +12%(런 내내)' },
      { id: 'pray', label: '기도한다', hint: '버섯조각 +60' },
      { id: 'leave', label: '떠난다', hint: '아무 일도 없어요' },
    ],
  },
  {
    eventId: 'lost-bean',
    title: '길 잃은 콩벌레',
    icon: '🪲',
    text: '다친 콩벌레가 길을 잃고 울고 있어요.',
    choices: [
      { id: 'help', label: '도와준다', hint: '버섯조각 −30, 보답으로 유물 제안(희귀 이상 가능)' },
      { id: 'ignore', label: '모른 척한다', hint: '아무 일도 없어요' },
    ],
  },
  {
    eventId: 'wishing-well',
    title: '소원의 우물',
    icon: '⛲',
    text: '맑은 우물이 있어요. 동전을 던지면 소원을 들어줄지도 몰라요.',
    choices: [
      { id: 'throw', label: '버섯조각 80을 던진다', hint: '50% 유물 제안, 50% 아무 일 없음' },
      { id: 'drink', label: '물을 마신다', hint: 'HP +20%' },
    ],
  },
  {
    eventId: 'rotten-log',
    title: '썩은 통나무',
    icon: '🪵',
    text: '속이 푹 썩은 통나무가 길을 막고 있어요.',
    choices: [
      { id: 'dig', label: '파헤친다', hint: '70% 버섯조각 +50 / 30% 곰팡이 HP −10%' },
      { id: 'rest', label: '기대서 쉰다', hint: 'HP +10%' },
    ],
  },
  {
    eventId: 'traveler',
    title: '떠돌이 상인',
    icon: '🎒',
    text: '낡은 가방을 멘 상인이 말을 걸어요. "좋은 물건이 있어!"',
    choices: [
      { id: 'potion', label: '회복약 (버섯조각 50)', hint: 'HP +40%' },
      { id: 'whet', label: '송곳니 연마 (버섯조각 100)', hint: '공격력 +8%(런 내내)' },
      { id: 'decline', label: '거절한다', hint: '아무 일도 없어요' },
    ],
  },
];

const EVENT_BY_ID = new Map(DUNGEON_EVENTS.map((e) => [e.eventId, e]));
export const findEvent = (eventId: string): DungeonEvent | undefined => EVENT_BY_ID.get(eventId);

export function rollEventId(seed: number, floor: number): string {
  const random = seededRandom(seed, floor, 3);
  return DUNGEON_EVENTS[Math.floor(random() * DUNGEON_EVENTS.length)].eventId;
}

export interface DungeonEventOutcome {
  message: string;
  hpDelta: number; // 최대 HP 대비 비율(음수면 깎인다. HP는 1 아래로 내려가지 않는다)
  gold: number; // 버섯조각 증감
  bonus?: Partial<DungeonBonus>; // 런 내내 유지되는 능력치 보너스
  offerRelic?: boolean; // 유물 제안으로 이어진다
}

// 이벤트 선택의 결과. 필요한 버섯조각이 모자라면 null(고를 수 없다).
export function resolveEvent(eventId: string, choiceId: string, gold: number, random: () => number): DungeonEventOutcome | null {
  const none = (message: string): DungeonEventOutcome => ({ message, hpDelta: 0, gold: 0 });
  switch (`${eventId}:${choiceId}`) {
    case 'mystery-mushroom:eat':
      return random() < 0.6
        ? { message: '🍄 몸이 가벼워졌어요! HP가 회복됐어요.', hpDelta: 0.3, gold: 0 }
        : { message: '🍄 으윽, 독버섯이었어요… HP가 깎였어요.', hpDelta: -0.15, gold: 0 };
    case 'mystery-mushroom:leave':
      return none('버섯을 지나쳤어요.');
    case 'old-altar:blood':
      return { message: '🗿 힘이 솟아올라요! 공격력이 올랐어요.', hpDelta: -0.2, gold: 0, bonus: { atk: 0.12 } };
    case 'old-altar:pray':
      return { message: '🗿 제단 아래에서 버섯조각을 찾았어요.', hpDelta: 0, gold: 60 };
    case 'old-altar:leave':
      return none('제단을 떠났어요.');
    case 'lost-bean:help':
      if (gold < 30) return null;
      return { message: '🪲 콩벌레가 고맙다며 유물을 내밀어요.', hpDelta: 0, gold: -30, offerRelic: true };
    case 'lost-bean:ignore':
      return none('모른 척 지나갔어요.');
    case 'wishing-well:throw':
      if (gold < 80) return null;
      return random() < 0.5
        ? { message: '⛲ 우물이 반짝이며 유물을 건네줘요!', hpDelta: 0, gold: -80, offerRelic: true }
        : { message: '⛲ 동전이 가라앉았어요… 아무 일도 없었어요.', hpDelta: 0, gold: -80 };
    case 'wishing-well:drink':
      return { message: '⛲ 시원한 물을 마시고 기운을 차렸어요.', hpDelta: 0.2, gold: 0 };
    case 'rotten-log:dig':
      return random() < 0.7
        ? { message: '🪵 통나무 속에서 버섯조각이 쏟아졌어요!', hpDelta: 0, gold: 50 }
        : { message: '🪵 곰팡이 포자를 들이마셨어요. HP가 깎였어요.', hpDelta: -0.1, gold: 0 };
    case 'rotten-log:rest':
      return { message: '🪵 잠깐 기대어 쉬었어요.', hpDelta: 0.1, gold: 0 };
    case 'traveler:potion':
      if (gold < 50) return null;
      return { message: '🎒 회복약을 마시고 기운이 났어요.', hpDelta: 0.4, gold: -50 };
    case 'traveler:whet':
      if (gold < 100) return null;
      return { message: '🎒 송곳니를 갈았어요. 공격력이 올랐어요.', hpDelta: 0, gold: -100, bonus: { atk: 0.08 } };
    case 'traveler:decline':
      return none('상인을 보내고 길을 떠났어요.');
    default:
      return null;
  }
}

// ---- 보상 ----
export const DUNGEON_GOLD_BASE = 40;
export const DUNGEON_GOLD_PER_FLOOR = 25; // 10층까지
export const DUNGEON_GOLD_PER_FLOOR_DEEP = 12; // 10층부터는 층마다 이만큼씩만 늘어난다
export const DUNGEON_XP_BASE = 10;
export const DUNGEON_XP_PER_FLOOR = 4;
export const DUNGEON_XP_PER_FLOOR_DEEP = 2;
export const DUNGEON_CLEAR_BONUS_RATE = 1.5; // 완주하면 골드·경험치 ×1.5
export const DUNGEON_FIRST_FLOOR_DIAMONDS: Record<number, number> = { 10: 3, 25: 3, 50: 5, 75: 8, 100: 20 }; // 지금까지의 최고 기록을 처음 넘어서며 지난 층의 다이아(어려운 난이도 기록이 있으면 쉬운 난이도로는 못 받는다)
export const DUNGEON_CLEAR_DIAMONDS = 2; // 100층을 완주할 때마다(하루 한 번째만)
export const DUNGEON_FIRST_CLEAR_EQUIPMENT_RARITY = 3; // 평생 첫 완주에서 받는 장비 희귀도

export function getDungeonRewards(floorsCleared: number, cleared: boolean, difficulty: DungeonDifficultyId = 'easy') {
  const mult = (findDungeonDifficulty(difficulty) ?? DUNGEON_DIFFICULTIES[0]).rewardMult;
  let gold = 0;
  let xp = 0;
  for (let f = 1; f <= floorsCleared; f++) {
    // 10층까지는 층마다 크게, 그 뒤로는 완만하게 늘어난다
    const early = Math.min(f, DUNGEON_CHAPTER);
    const deep = Math.max(0, f - DUNGEON_CHAPTER);
    gold += DUNGEON_GOLD_BASE + DUNGEON_GOLD_PER_FLOOR * early + DUNGEON_GOLD_PER_FLOOR_DEEP * deep;
    xp += DUNGEON_XP_BASE + DUNGEON_XP_PER_FLOOR * early + DUNGEON_XP_PER_FLOOR_DEEP * deep;
  }
  if (cleared) {
    gold = Math.round(gold * DUNGEON_CLEAR_BONUS_RATE);
    xp = Math.round(xp * DUNGEON_CLEAR_BONUS_RATE);
  }
  return { gold: Math.round(gold * mult), xp: Math.round(xp * mult) };
}

// 던전 순위: 가장 높이 오른 층이 높은 순, 같으면 완주 횟수가 많은 순. 같은 성적은 같은 순위(1, 1, 3).
// 기록은 난이도와 층을 한 숫자로 합쳐서(난이도 번호 × 1000 + 층) 저장한다. 어려운 난이도의 1층이 쉬운 난이도의 100층보다 높게 센다.
export const DUNGEON_SCORE_STEP = 1000;
export const dungeonScore = (difficulty: DungeonDifficultyId, floor: number): number =>
  Math.max(0, DUNGEON_DIFFICULTY_IDS.indexOf(difficulty)) * DUNGEON_SCORE_STEP + floor;
// 10층 던전 시절에는 난이도 번호 × 100 + 층으로 저장했다. 쉬운 난이도(≤100)와 새 형식(≥1000) 사이의 값(101~999)은 옛 형식뿐이라 구분할 수 있다.
export function normalizeDungeonScore(raw: number | null | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > DUNGEON_FLOORS && n < DUNGEON_SCORE_STEP) return Math.floor(n / 100) * DUNGEON_SCORE_STEP + (n % 100);
  return n;
}
export function describeDungeonScore(score: number): string {
  const n = normalizeDungeonScore(score);
  const d = DUNGEON_DIFFICULTIES[Math.min(DUNGEON_DIFFICULTIES.length - 1, Math.floor(n / DUNGEON_SCORE_STEP))];
  return `${d.name} ${n % DUNGEON_SCORE_STEP}층`;
}
export function rankDungeon(rows: { bestScore: number; clears: number }[]): number[] {
  const ranks: number[] = [];
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    ranks.push(prev && prev.bestScore === row.bestScore && prev.clears === row.clears ? ranks[i - 1] : i + 1);
  });
  return ranks;
}
