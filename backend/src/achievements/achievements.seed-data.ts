import { AchievementStatKey } from './schemas/achievement.schema';

interface StatTier {
  statKey: AchievementStatKey;
  icon: string;
  label: string;
  descriptionOf: (target: number) => string;
  tiers: {
    target: number;
    reward: number;
    ticketReward?: number;
    diamondReward?: number;
  }[];
}

// 성장 지표 기반 업적. births/sold/explored/earned는 stats에서, discovered/terrariums는
// 계정 자체 길이에서 읽는다(둘 다 절대 줄어들지 않는 값이라 업적 조건으로 적합하다).
const STAT_TIERS: StatTier[] = [
  {
    statKey: 'births',
    icon: 'heart',
    label: '탄생의 기록',
    descriptionOf: (t) => `새 식구가 태어난 횟수 누적 ${t}회`,
    tiers: [
      { target: 10, reward: 200, diamondReward: 3 },
      { target: 50, reward: 1000, diamondReward: 8 },
      { target: 200, reward: 5000, diamondReward: 20 },
    ],
  },
  {
    statKey: 'sold',
    icon: 'coins',
    label: '분양의 달인',
    descriptionOf: (t) => `분양 보낸 등각류 누적 ${t}마리`,
    tiers: [
      { target: 20, reward: 300, diamondReward: 3 },
      { target: 100, reward: 1500, diamondReward: 8 },
      { target: 500, reward: 8000, diamondReward: 20 },
    ],
  },
  {
    statKey: 'explored',
    icon: 'search',
    label: '숲의 탐험가',
    descriptionOf: (t) => `숲 탐색 누적 ${t}회`,
    tiers: [
      { target: 10, reward: 300, ticketReward: 2, diamondReward: 3 },
      { target: 50, reward: 1500, ticketReward: 5, diamondReward: 8 },
      { target: 200, reward: 8000, ticketReward: 15, diamondReward: 20 },
    ],
  },
  {
    statKey: 'earned',
    icon: 'sprout',
    label: '작은 숲의 부자',
    descriptionOf: (t) => `누적 수익 ${t.toLocaleString('ko-KR')} G`,
    tiers: [
      { target: 5000, reward: 500, diamondReward: 3 },
      { target: 50000, reward: 3000, diamondReward: 8 },
      { target: 500000, reward: 15000, diamondReward: 20 },
    ],
  },
  {
    statKey: 'terrariums',
    icon: 'expand',
    label: '숲의 확장',
    descriptionOf: (t) => `사육장 누적 ${t}개 보유`,
    tiers: [
      { target: 3, reward: 1000, diamondReward: 5 },
      { target: 6, reward: 4000, diamondReward: 12 },
      { target: 10, reward: 10000, diamondReward: 25 },
    ],
  },
  {
    statKey: 'discovered',
    icon: 'leaf',
    label: '기록하는 숲지기',
    descriptionOf: (t) => `도감에 ${t}종 기록하기`,
    tiers: [
      { target: 20, reward: 1500, diamondReward: 10 },
      { target: 40, reward: 4000, diamondReward: 20 },
    ],
  },
  {
    statKey: 'battlesWon',
    icon: 'sword',
    label: '숲의 전사',
    descriptionOf: (t) => `야생 배틀 승리 누적 ${t}회`,
    tiers: [
      { target: 10, reward: 300, diamondReward: 5 },
      { target: 50, reward: 1500, diamondReward: 12 },
      { target: 150, reward: 6000, diamondReward: 25 },
    ],
  },
  {
    statKey: 'pvpWins',
    icon: 'vs',
    label: '투기장의 강자',
    descriptionOf: (t) => `투기장 승리 누적 ${t}회`,
    tiers: [
      { target: 5, reward: 400, diamondReward: 8 },
      { target: 30, reward: 2000, diamondReward: 18 },
      { target: 100, reward: 8000, diamondReward: 35 },
    ],
  },
  {
    statKey: 'peakPvpRating',
    icon: 'medal',
    label: '레이팅 등반가',
    descriptionOf: (t) => `투기장 레이팅 ${t}점 달성`,
    tiers: [
      { target: 1100, reward: 800, diamondReward: 10 },
      { target: 1300, reward: 3000, diamondReward: 20 },
      { target: 1500, reward: 10000, diamondReward: 40 },
    ],
  },
  {
    statKey: 'trainCount',
    icon: 'dumbbell',
    label: '훈련의 정석',
    descriptionOf: (t) => `전투 훈련 누적 ${t}회`,
    tiers: [
      { target: 10, reward: 300, diamondReward: 5 },
      { target: 50, reward: 1200, diamondReward: 12 },
      { target: 150, reward: 4000, diamondReward: 25 },
    ],
  },
  {
    statKey: 'highestBattleLevel',
    icon: 'star',
    label: '단련된 전투력',
    descriptionOf: (t) => `종 하나를 전투 Lv.${t}까지 키우기`,
    tiers: [
      { target: 10, reward: 600, diamondReward: 12 },
      { target: 25, reward: 2500, diamondReward: 30 },
    ],
  },
  {
    statKey: 'friendsCount',
    icon: 'friends',
    label: '숲의 인연',
    descriptionOf: (t) => `친구 ${t}명 만들기`,
    tiers: [
      { target: 1, reward: 500, ticketReward: 3, diamondReward: 10 },
      { target: 5, reward: 2000, ticketReward: 5, diamondReward: 20 },
    ],
  },
  {
    statKey: 'nicknames',
    icon: 'pencil',
    label: '애칭 짓기',
    descriptionOf: (t) => `콩벌레에게 별명 ${t}개 지어주기`,
    tiers: [{ target: 3, reward: 500, diamondReward: 8 }],
  },
];

const statAchievements = STAT_TIERS.flatMap(({ statKey, icon, label, descriptionOf, tiers }) =>
  tiers.map((tier, i) => ({
    achievementId: `${statKey}_${tier.target}`,
    label: tiers.length > 1 ? `${label} ${'I'.repeat(i + 1)}` : label,
    description: descriptionOf(tier.target),
    icon,
    type: 'stat' as const,
    statKey,
    target: tier.target,
    reward: tier.reward,
    ticketReward: tier.ticketReward ?? 0,
    diamondReward: tier.diamondReward ?? 0,
  })),
);

// 희귀도별 완전 수집 업적. reward는 해당 희귀도 분양가 수준에 맞춰 정했다.
const RARITY_LABELS = ['일반', '희귀', '에픽', '전설', '신화'];
const RARITY_REWARD = [500, 1500, 5000, 15000, 30000];
const RARITY_DIAMOND_REWARD = [5, 15, 40, 100, 200];

const collectionAchievements = RARITY_LABELS.map((name, rarity) => ({
  achievementId: `collection_rarity_${rarity}`,
  label: `${name} 등급 수집가`,
  description: `${name} 등급 등각류를 모두 도감에 기록하기`,
  icon: 'book',
  type: 'collectionRarity' as const,
  rarity,
  reward: RARITY_REWARD[rarity],
  ticketReward: 0,
  diamondReward: RARITY_DIAMOND_REWARD[rarity],
}));

export const ACHIEVEMENTS_SEED = [
  ...statAchievements,
  ...collectionAchievements,
  {
    achievementId: 'collection_all',
    label: '작은 숲의 백과사전',
    description: '모든 등각류를 도감에 기록하기',
    icon: 'trophy',
    type: 'collectionAll' as const,
    reward: 50000,
    ticketReward: 10,
    diamondReward: 500,
  },
];
