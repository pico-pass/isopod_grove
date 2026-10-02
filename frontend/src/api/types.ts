export interface Species {
  speciesId: string;
  name: string;
  latin: string;
  rarity: number;
  price: number;
  basePrice: number;
  rate: number;
  breed: number;
  image?: string;
  filter: string;
  description: string;
}

export interface Upgrade {
  upgradeId: string;
  name: string;
  icon: string;
  max: number;
  cost: number;
  factor: number;
  description: string;
}

export interface Quest {
  questId: string;
  label: string;
  target: number;
  reward: number;
  ticketReward: number;
}

export interface DailyProgress {
  day: string;
  feed: number;
  observe: number;
  births: number;
  explore: number;
  claimed: string[];
}

export interface Stats {
  births: number;
  sold: number;
  earned: number;
  explored: number;
  played: number;
  battlesWon: number;
  battlesLost: number;
  pvpWins: number;
  pvpLosses: number;
  trainCount: number;
  peakPvpRating: number;
  highestBattleLevel: number;
  equipmentPulls: number;
}

export interface LogEntry {
  at: number;
  type: string;
  text: string;
}

export interface Terrarium {
  terrariumId: string;
  name: string;
  spaceLevel: number;
  food: number;
  humidity: number;
  temperature: number;
  population: Record<string, number>;
  breeding: Record<string, number>;
}

export type EquipmentCategory = 'weapon' | 'armor' | 'charm';

export interface EquipmentCatalogItem {
  equipmentId: string;
  name: string;
  icon: string;
  category: EquipmentCategory;
  rarity: number;
  description: string;
}

export interface EquipmentItemState {
  itemId: string;
  copies: number;
  level: number;
  maxLevel: number;
  awakenCount: number;
  awakenFailures: number;
}

export interface GameState {
  _id: string;
  userId: string;
  coins: number;
  pending: number;
  explorationTickets: number;
  diamonds: number;
  xp: number;
  // 야생 배틀 전투 경험치. key: speciesId. 레벨은 getBattleLevelProgress로 계산한다.
  battleXp: Record<string, number>;
  // 투기장(PvP) 방어 식구로 지정한 종. 지정 전엔 null.
  pvpDefenseSpeciesId: string | null;
  pvpRating: number;
  // 종(콩벌레)에 붙인 내 전용 별명. key: speciesId, value: 별명. 없으면 기본 이름을 쓴다.
  speciesNicknames: Record<string, string>;
  // 보유 장비(종류별 1줄), 장착 슬롯(칸마다 itemId, 빈 칸은 ''), 전설 이상 천장 카운터
  equipment: EquipmentItemState[];
  equipmentSlots: string[];
  equipmentPity: number;
  terrariums: Terrarium[];
  discovered: string[];
  upgrades: Record<string, number>;
  daily: DailyProgress;
  stats: Stats;
  cooldowns: Record<string, number>;
  achievementsClaimed: string[];
  logs: LogEntry[];
  paused: boolean;
  sound: boolean;
}

export type AchievementType = 'stat' | 'collectionRarity' | 'collectionAll';
export type AchievementStatKey =
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
  | 'equipmentSlots';

export interface Achievement {
  achievementId: string;
  label: string;
  description: string;
  icon: string;
  type: AchievementType;
  statKey?: AchievementStatKey;
  target?: number;
  rarity?: number;
  reward: number;
  ticketReward: number;
  diamondReward: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  isMe: boolean;
  value: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  me: (LeaderboardEntry & { inTop: boolean }) | null;
}

export interface PublicProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  profileMessage?: string;
  createdAt?: string;
  xp: number;
  pvpRating: number;
  discoveredCount: number;
  totalPopulation: number;
  achievementsClaimedCount: number;
  stats: {
    battlesWon: number;
    battlesLost: number;
    pvpWins: number;
    pvpLosses: number;
  };
}

export interface Friend {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  canGiftToday: boolean;
}

export interface FriendRequest {
  requestId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export interface FriendsListResult {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
}

export interface FriendSearchResult {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export interface OnlinePlayer {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export interface OnlinePlayersResult {
  count: number;
  players: OnlinePlayer[];
}

export type ChatChannel = 'free' | 'question' | 'inquiry';

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  channel: ChatChannel;
  text: string;
  createdAt: number;
}

export interface AdminStats {
  content: {
    species: number;
    upgrades: number;
    quests: number;
    achievements: number;
  };
  players: {
    users: number;
    gameStates: number;
  };
  economy: {
    coins: number;
    diamonds: number;
    explorationTickets: number;
  };
  server: {
    uptimeSeconds: number;
    nodeVersion: string;
    platform: string;
    memory: {
      rssMb: number;
      heapUsedMb: number;
    };
  };
}

export interface CombatStats {
  hp: number;
  atk: number;
  def: number;
}

export interface BattleTurn {
  turn: number;
  attacker: 'me' | 'enemy';
  damage: number;
  remainingHp: number;
}

export interface BattleFighter {
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  rarity: number;
  stats: CombatStats;
  level: number;
}

export interface SpeciesLevelResult {
  speciesId: string;
  leveledUp: boolean;
  level: number;
  currentXp: number;
  requiredXp: number;
  xpGained: number;
}

export interface BattleResponse {
  gameState: GameState;
  message: string;
  result: 'win' | 'lose';
  difficulty: number;
  mine: BattleFighter;
  enemy: BattleFighter;
  log: BattleTurn[];
  reward: { coins: number; diamonds: number };
  speciesLevel: SpeciesLevelResult;
}

export interface TrainResponse {
  gameState: GameState;
  message: string;
  cost: number;
  diamondCost: number;
  speciesLevel: SpeciesLevelResult;
}

export interface PvpOpponentSpecies {
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  rarity: number;
}

export interface PvpOpponent {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  pvpRating: number;
  species: PvpOpponentSpecies;
  level: number;
  // 상대 장비 보너스까지 반영한 미리보기 스탯
  stats: CombatStats;
}

export interface PvpOpponentResult {
  opponent: PvpOpponent | null;
  message?: string;
}

export interface PvpFighter extends BattleFighter {
  ownerName?: string;
}

export interface PvpBattleResponse {
  gameState: GameState;
  message: string;
  result: 'win' | 'lose';
  rating: number;
  ratingDelta: number;
  mine: BattleFighter;
  enemy: PvpFighter;
  log: BattleTurn[];
  reward: { coins: number; diamonds: number };
  speciesLevel: SpeciesLevelResult;
}

export interface EquipmentPullResult {
  itemId: string;
  isNew: boolean;
  copies: number;
  level: number;
}

export interface EquipmentPullResponse {
  gameState: GameState;
  message: string;
  results: EquipmentPullResult[];
  cost: number;
}

export interface EquipmentAwakenResponse {
  gameState: GameState;
  message: string;
  success: boolean;
  chance: number;
  cost: number;
}

export type CareAction = 'feed' | 'mist' | 'climate';

export interface ActionResult {
  gameState: GameState;
  message?: string;
  coins?: number;
  species?: Species;
  terrariumId?: string;
  isNew?: boolean;
  births?: number;
  earned?: number;
}
