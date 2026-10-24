// 종의 계열. 보스 타워·야생 배틀의 상성과 환경 보정에 쓰인다(불꽃 > 숲 > 서리 > 불꽃).
export type SpeciesFamily = 'fire' | 'forest' | 'frost';
export type FamilyMatchup = 'advantage' | 'even' | 'disadvantage';

export interface BattleEnvironmentInfo {
  id: string;
  name: string;
  description: string;
  family: SpeciesFamily | null; // 이 환경이 편드는 계열
}

// 한 전투에 적용된 규칙. 공격력·방어력에 곱해진 최종 배율(상성 ±3% + 환경 +3%)을 보여준다.
export interface BattleRules {
  environment: BattleEnvironmentInfo | null; // 환경이 없는 전투(예전 서바이벌)는 null이다(상성만 적용)
  mine: { family: SpeciesFamily; matchup: FamilyMatchup; multiplier: number };
  enemy: { family: SpeciesFamily; multiplier: number };
}

export interface Species {
  speciesId: string;
  name: string;
  latin: string;
  family?: SpeciesFamily;
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
  // 오늘 쓴 보스 타워 도전 횟수. 예전 데이터에는 없을 수 있다.
  bossAttempts?: number;
  survivalAttempts?: number;
  // 오늘 다이아로 산 추가 도전/입장 횟수. 하루 한도 = 기본 횟수 + 이 값. 예전 데이터에는 없을 수 있다.
  bossExtraAttempts?: number;
  survivalExtraAttempts?: number;
  // 오늘 다녀온 원정·대원정 횟수. 예전 데이터에는 없을 수 있다.
  expeditionCount?: number;
  grandExpeditionCount?: number;
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
  highestBossFloor: number; // 보스 타워 쉬움에서 깬 최고 층
  // 보스 타워 난이도별로 깬 최고 층. 예전 데이터에는 없을 수 있다.
  bossFloorNormal?: number;
  bossFloorHard?: number;
  bossFloorExtreme?: number;
  bossWins: number;
  // 투기장 현재 연승 / 최고 연승. 예전 데이터에는 없을 수 있다.
  pvpWinStreak?: number;
  bestPvpWinStreak?: number;
  // 서바이벌 최고 스테이지 / 입장 횟수. 예전 데이터에는 없을 수 있다.
  highestSurvivalStage?: number;
  survivalRuns?: number;
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
  // 꾸미기: 배경 장식 id(없으면 '')와 소품 칸(4칸, 빈 칸은 ''). 예전 데이터에는 없을 수 있다.
  decorBackdrop?: string;
  decorProps?: string[];
}

export type DecorKind = 'backdrop' | 'prop';

export interface DecorItem {
  decorId: string;
  kind: DecorKind;
  name: string;
  icon: string;
  tier: 0 | 1 | 2; // 일반 / 희귀 / 에픽
  family: SpeciesFamily | null; // 같은 계열 종의 번식을 빠르게 한다(null이면 꾸미기 전용)
  price: number;
  breedBonusPercent: number;
  description: string;
  tint?: [string, string]; // 배경만: 사육장 사진 위에 덮는 그라데이션 색
  // 절기·명절 한정 장식이면 이벤트 id·이름과, 지금 살 수 있는지(기간 중인지). 산 뒤에는 기간과 상관없이 놓을 수 있다.
  eventId?: string;
  eventName?: string;
  available?: boolean;
}

export interface DecorCatalog {
  propSlots: number;
  tierNames: string[];
  items: DecorItem[];
}

export interface VisitResident {
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  rarity: number;
  family: SpeciesFamily;
  count: number;
}

export interface VisitTerrarium {
  terrariumId: string;
  name: string;
  backdrop: string;
  props: string[];
  total: number;
  residents: VisitResident[];
  likes: number;
  likedByMe: boolean;
}

export interface VisitLiker {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  terrariumName: string;
  at: number;
}

// 방문 화면에 보이는 표본 전시관(진열한 표본이 없으면 null)
export interface VisitExhibition {
  likeId: string; // 좋아요를 누를 때 terrariumId 자리에 쓰는 값('exhibition')
  slots: number;
  score: number;
  specimens: { speciesId: string; name: string; image?: string; filter: string; rarity: number; family: SpeciesFamily; tier: number; tierName: string; tierIcon: string; score: number }[];
  likes: number;
  likedByMe: boolean;
}

export interface VisitResult {
  owner: { userId: string; displayName: string; avatarUrl?: string; profileMessage?: string; level: number };
  isMe: boolean;
  isPublic: boolean;
  terrariums: VisitTerrarium[];
  exhibition?: VisitExhibition | null;
  totalLikes: number;
  recentLikers: VisitLiker[];
}

export type EquipmentCategory = 'weapon' | 'armor' | 'charm';

export interface EquipmentCatalogItem {
  equipmentId: string;
  name: string;
  icon: string;
  category: EquipmentCategory;
  rarity: number;
  description: string;
  // 같은 테마의 무기·방어구·장신구 세 개가 한 세트다.
  setId: string;
  setName: string;
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
  // 지금까지 숲 탐색을 한 횟수. 탐색 비용이 이 횟수만큼 올라간다(초기화 없음). 예전 데이터에는 없을 수 있다.
  exploreCostSteps?: number;
  diamonds: number;
  xp: number;
  // 야생 배틀 전투 경험치. key: speciesId. 레벨은 getBattleLevelProgress로 계산한다.
  battleXp: Record<string, number>;
  battleStars?: Record<string, number>; // 전투 레벨 각성 ★ 개수(종 id → 개수). 예전 계정은 없을 수 있다.
  // 투기장(PvP) 방어 식구로 지정한 종. 지정 전엔 null.
  pvpDefenseSpeciesId: string | null;
  pvpRating: number;
  // 종(콩벌레)에 붙인 내 전용 별명. key: speciesId, value: 별명. 없으면 기본 이름을 쓴다.
  speciesNicknames: Record<string, string>;
  // 보유 장비(종류별 1줄), 장착 슬롯(칸마다 itemId, 빈 칸은 ''), 전설 이상 천장 카운터
  equipment: EquipmentItemState[];
  equipmentSlots: string[];
  equipmentPity: number;
  // 잠근 종(speciesId). 잠근 종은 분양할 수 없다. 예전 데이터에는 없을 수 있다.
  lockedSpecies?: string[];
  // 장비 조각(중복 장비를 분해해서 얻는다), 신화 원정 천장 진행도. 예전 데이터에는 없을 수 있다.
  equipmentShards?: number;
  expeditionPity?: number;
  // 골드로 산 부스트(종류별 하나). 예전 데이터에는 없을 수 있다.
  boosts?: ActiveBoost[];
  // 산 장식 id(계정 공용)와 사육장 방문 공개 여부(기본 공개). 예전 데이터에는 없을 수 있다.
  decorOwned?: string[];
  terrariumPublic?: boolean;
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
  | 'equipmentSlots'
  | 'highestBossFloor'
  | 'bossWins'
  | 'bestPvpWinStreak'
  | 'highestSurvivalStage'
  | 'decorOwned'
  | 'epicDecor'
  | 'decorFilled'
  | 'likesReceived'
  | 'likesGiven';

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
  // 값 대신 보여줄 문구(보스 타워의 "어려움 12층" 같은 것)
  label?: string;
  // 그 기록을 세운 콩벌레(콩 달리기 순위에만 있다)
  species?: { speciesId: string; name: string; image?: string; filter: string; rarity: number };
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
  online: boolean;
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

export interface FriendChatMessage {
  id: string;
  userId: string; // 보낸 사람
  text: string; // 삭제된 메시지는 빈 문자열
  createdAt: number;
  deleted: boolean;
}

// 대화를 가져올 때마다 "지금 상태"가 함께 온다(읽음·삭제·접속 표시를 항상 최신으로 맞추려고).
export interface FriendChatPoll {
  messages: FriendChatMessage[];
  friendUnreadIds: string[]; // 내가 보낸 메시지 중 상대가 아직 안 읽은 것
  deletedIds: string[];
  friendOnline: boolean;
}

export type ChatReportReason = 'abuse' | 'spam' | 'inappropriate' | 'other';
export type ChatReportStatus = 'open' | 'resolved' | 'dismissed';

export interface AdminChatReport {
  id: string;
  reporter: { userId: string; displayName: string };
  reported: { userId: string; displayName: string };
  reportedReporterCount: number; // 신고당한 사람을 지금까지 신고한 서로 다른 유저 수
  reason: ChatReportReason;
  reasonLabel: string;
  detail: string;
  messageText: string;
  messageId: string;
  context: { messageId: string; sender: 'reporter' | 'reported'; text: string; createdAt: number }[];
  status: ChatReportStatus;
  adminNote: string;
  handledAt: number | null;
  createdAt: number;
  // 신고당한 유저가 지금 채팅 정지 중이면 풀리는 시각, 그리고 이 신고를 처리하면서 건 정지
  reportedBanUntil: number | null;
  sanction: { days: number; until: number } | null;
}

export interface AdminChatBan {
  userId: string;
  displayName: string;
  until: number;
  reason: string;
}

export interface ResolveReportResult {
  id: string;
  status: string;
  ban: { days: number; until: number } | null;
  notified: boolean;
}

// 알림 종류별 켜기/끄기(푸시 알림과 화면 안의 알림 모두에 적용)
export interface NotificationPrefs {
  friendChat: boolean;
  mail: boolean;
  terrariumLike: boolean;
}

// 내 사육장이 지금 받은 좋아요 수와 내가 지금 누르고 있는 좋아요 수(업적·새 좋아요 알림용)
// 오늘의 숲 날씨(실제 서울 날씨). 정보가 없으면 available: false이고 효과도 없다.
export interface WeatherInfo {
  available: boolean;
  city: string;
  type?: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'heat' | 'cold';
  name?: string;
  icon?: string;
  flavor?: string;
  tempC?: number;
  humidity?: number;
  observedAt?: number;
  favoredFamily?: SpeciesFamily; // 이 날씨가 편드는 계열
  breedBonusPercent?: number; // 그 계열 종의 번식 보너스(%)
  exploreWeight?: number; // 숲 탐색·원정에서 그 계열 종이 나올 가중치 배수
  effects?: string[]; // 화면에 보여 줄 효과 설명
}

export interface VisitSummary {
  received: number;
  given: number;
}

export interface AdminChatReportList {
  openCount: number;
  reports: AdminChatReport[];
}

export interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
}

export interface FriendChatUnread {
  total: number;
  byFriend: Record<string, number>;
}

export interface MailRewards {
  coins: number;
  diamonds: number;
  explorationTickets: number;
}

export interface MailItem {
  id: string;
  title: string;
  body: string;
  rewards: MailRewards;
  hasRewards: boolean;
  read: boolean;
  claimed: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface MailSummary {
  unread: number;
  claimable: number;
  badge: number;
}

export interface MailListResult {
  mails: MailItem[];
  summary: MailSummary;
}

export interface MailClaimResult extends ActionResult {
  summary: MailSummary;
  claimed?: number; // 모두 받기에서 받은 우편 수
}

export interface AdminMailRequest {
  target: 'all' | 'users';
  userIds?: string[];
  title: string;
  body?: string;
  coins?: number;
  diamonds?: number;
  explorationTickets?: number;
  expireDays?: number;
  push?: boolean;
}

export interface AdminMailSendResult {
  batchId: string;
  recipients: number;
  pushRequested: boolean;
  message: string;
}

export interface AdminMailHistoryItem {
  batchId: string;
  title: string;
  body: string;
  rewards: MailRewards;
  createdAt: string;
  expiresAt: string;
  recipients: number;
  read: number;
  claimed: number;
}

export interface AdminUserSearchResult {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
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
  // 보스 패턴이 있을 때만 붙는다.
  note?: string; // 이번 턴에 발동한 패턴
  myHp?: number; // 상대 공격 말고 내 HP가 바뀐 경우(가시갑옷 반사)의 최종 HP
  enemyHp?: number; // 내 공격 말고 보스 HP가 바뀐 경우(재생)의 최종 HP
}

export interface BattleFighter {
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  rarity: number;
  stats: CombatStats;
  level: number;
  family?: SpeciesFamily; // 상성이 적용되는 전투(보스 타워·야생 배틀)에서만 있다
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
  rules?: BattleRules | null;
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

export interface BossPatternInfo {
  id: string;
  name: string;
  description: string;
}

export interface BossFloorInfo {
  floor: number;
  isBoss: boolean;
  species: {
    speciesId: string;
    name: string;
    image?: string;
    filter: string;
    rarity: number;
    family?: SpeciesFamily;
  } | null;
  environment?: string; // BossCatalog.rules.environments의 id
  stats: CombatStats;
  patterns: BossPatternInfo[];
  rewards: {
    firstCoins: number;
    firstDiamonds: number;
    repeatDiamondChance: number;
    repeatDiamonds: number;
    firstEquipmentRarity: number | null;
    repeatCoins: number;
    repeatCopyChance: number;
    equipmentIds: string[];
  };
}

export type BossDifficultyId = 'easy' | 'normal' | 'hard' | 'extreme';

// 보스 능력치와 골드·경험치 보상에 곱해지는 배율
export interface BossDifficultyInfo {
  id: BossDifficultyId;
  name: string;
  multiplier: number;
}

export interface BossCatalog {
  dailyAttempts: number;
  // 직접 전투에서 쓸 수 있는 행동 설명
  duelActions: { id: DuelActionId; name: string; description: string }[];
  // 다이아로 사는 추가 도전: 오늘 N번째 가격(배열 길이 = 하루 최대 횟수)
  extraAttemptCosts: number[];
  // 쿨타임을 건너뛸 때 남은 이 초마다 💎1(올림)
  cooldownSkipSecondsPerDiamond: number;
  difficulties: BossDifficultyInfo[];
  rules?: {
    familyBeats: Record<SpeciesFamily, SpeciesFamily>;
    matchupBonus: number;
    environmentBonus: number;
    environments: BattleEnvironmentInfo[];
  };
  floors: BossFloorInfo[];
}

export type SurvivalBuffId = 'atk' | 'def' | 'hp' | 'heal' | 'regen';

export interface SurvivalBuffInfo {
  id: SurvivalBuffId;
  name: string;
  description: string;
}

// 서바이벌 규칙 안내(서버가 내려준다)
export interface SurvivalInfo {
  dailyAttempts: number;
  maxStage: number;
  eliteEvery: number;
  healRate: number;
  buffs: SurvivalBuffInfo[];
  extraAttemptCosts: number[];
  reviveCosts: number[];
  reviveHpRate: number;
  rewards: {
    goldBase: number;
    goldPerStage: number;
    xpBase: number;
    xpPerStage: number;
    milestoneEvery: number;
    milestoneDiamonds: number;
    firstReach: { stage: number; rarity: number }[];
  };
}

// 진행 중인 런(능력치는 버프까지 반영한 값)
export interface SurvivalRunView {
  speciesId: string;
  speciesName: string;
  level: number;
  stage: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  healRate: number;
  buffs: { atk: number; def: number; hp: number; regen: number };
  choices: SurvivalBuffInfo[];
  goldEarned: number;
  xpEarned: number;
  diamondsEarned: number;
  // 쓰러진 채 부활을 기다리는 중이면 dead. 부활할 수 있으면 reviveCost에 가격(💎)이 있다.
  dead: boolean;
  revives: number;
  reviveCost: number | null;
  // 'direct'면 일반 스테이지는 자동으로, 엘리트는 직접 전투로 진행하는 런. 엘리트와 싸우는 중이면 duel에 전투 상태가 있다.
  mode: SurvivalMode;
  duel: SurvivalDuelView | null;
}

export type SurvivalMode = 'auto' | 'direct';

// 오늘 다이아로 산 추가 횟수: 지금까지 산 횟수 / 하루 최대 / 다음 가격(더 못 사면 null)
export interface ExtraAttemptInfo {
  bought: number;
  max: number;
  nextCost: number | null;
}

export interface SurvivalStatus {
  run: SurvivalRunView | null;
  attemptsLeft: number;
  bestStage: number;
  extra: ExtraAttemptInfo;
}

// ---- 고급 탐색(원정) ----
export interface ExpeditionTierInfo {
  tier: number;
  name: string;
  price: number; // 내 탐색 횟수에 맞춰 서버가 계산한 가격
  odds: { rarity: number; percent: number }[];
  dailyLimit: number; // 하루에 갈 수 있는 횟수
  usedToday: number; // 오늘 다녀온 횟수
}

export interface ExpeditionInfo {
  pity: number; // 신화를 못 만난 채 다녀온 횟수
  pityLimit: number;
  yield: number;
  tiers: ExpeditionTierInfo[];
}

export interface ExpeditionResponse {
  gameState: GameState;
  message: string;
  species: Species;
  isNew: boolean;
  rarity: number;
  tier: number;
  cost: number;
  forced: boolean; // 신화 천장으로 확정된 원정인지
  pity: number;
  pityLimit: number;
  dailyLimit: number;
  usedToday: number;
}

// ---- 장비 조각 ----
export interface DismantleResponse {
  gameState: GameState;
  message: string;
  gained: number;
  shards: number;
  dismantled: { itemId: string; name: string; count: number; shards: number }[];
}

export interface ShardLevelUpResponse {
  gameState: GameState;
  message: string;
  shardsUsed: number;
  goldUsed: number;
  copiesFilled: number;
}

// ---- 부스트 상점 ----
export type BoostKind = 'income' | 'breed' | 'battleXp';

// 켜져 있는 부스트의 시간대(ms). GameState.boosts에 들어 있다.
export interface ActiveBoost {
  kind: BoostKind;
  from: number;
  until: number;
}

export interface BoostOffer {
  hours: number;
  price: number;
}

export interface BoostInfo {
  kind: BoostKind;
  name: string;
  description: string;
  activeUntil: number; // 켜져 있으면 끝나는 시각(ms), 아니면 0
  offers: BoostOffer[];
}

export interface BoostShop {
  hourlyIncome: number; // 가격의 기준이 되는 시간당 최대 수익
  multiplier: number;
  maxStackHours: number;
  boosts: BoostInfo[];
}

export interface BuyBoostResponse {
  gameState: GameState;
  message: string;
  price: number;
  activeUntil: number;
}

export interface BuyAttemptResponse {
  gameState: GameState;
  message: string;
  attemptsLeft: number;
  extra: ExtraAttemptInfo;
}

export interface SkipCooldownResponse {
  gameState: GameState;
  message: string;
  cost: number;
}

export interface SurvivalStageView {
  stage: number;
  isElite: boolean;
  patterns: BossPatternInfo[];
  enemy: {
    speciesId: string;
    name: string;
    image?: string;
    filter: string;
    rarity: number;
    stats: CombatStats;
    family?: SpeciesFamily;
  };
  rules?: BattleRules | null; // 이 스테이지에 적용된 계열 상성(공격·방어 배율)
  hpBefore: number;
  hpAfter: number;
  maxHp: number;
  won: boolean;
  log: BattleTurn[]; // 엘리트와 마지막(패배) 전투에만 있다
}

export interface SurvivalResponse {
  gameState: GameState;
  message: string;
  // 'duel'은 엘리트 직접 전투가 기다리거나 진행 중이라는 뜻이다.
  status: 'choose' | 'dead' | 'cleared' | 'retired' | 'duel';
  stages: SurvivalStageView[];
  run: SurvivalRunView | null;
  mine?: {
    speciesId: string;
    name: string;
    image?: string;
    filter: string;
    rarity: number;
    level: number;
    stats: CombatStats;
  };
  attemptsLeft: number;
  summary: {
    finalStage: number;
    bestStage: number;
    newBest: boolean;
    gold: number;
    xp: number;
    diamonds: number;
    equipment: { itemId: string; name: string; rarity: number; isNew: boolean; copies: number }[];
  };
}

// 엘리트 직접 전투를 한 턴 진행했지만 아직 끝나지 않았을 때의 응답. 끝나면 보통의 SurvivalResponse가 온다.
export interface SurvivalDuelStepResponse {
  gameState: GameState;
  message: string;
  step: true;
  status: 'duel';
  stages: [];
  run: SurvivalRunView;
  turns: BattleTurn[]; // 방금 일어난 일(내 행동, 상대 행동)
  attemptsLeft: number;
}

export interface BossBattleResponse {
  gameState: GameState;
  message: string;
  result: 'win' | 'lose';
  floor: number;
  isBoss: boolean;
  difficulty: BossDifficultyInfo;
  firstClear: boolean;
  attemptsLeft: number;
  patterns: BossPatternInfo[];
  mine: BattleFighter;
  enemy: BattleFighter;
  rules?: BattleRules | null;
  log: BattleTurn[];
  reward: {
    coins: number;
    diamonds: number;
    equipment: { itemId: string; name: string; rarity: number; isNew: boolean; copies: number } | null;
  };
  speciesLevel: SpeciesLevelResult;
}

// ---- 보스 직접 전투(매 턴 행동을 고르는 전투) ----
export type DuelActionId = 'attack' | 'guard' | 'strike' | 'heal' | 'skill';

export interface DuelActionView {
  id: DuelActionId;
  name: string;
  description: string;
  available: boolean;
  reason?: string; // 지금 못 고르는 이유
  // 계열 기술(id: 'skill')일 때만: 내 식구의 계열과 다시 쓸 수 있을 때까지의 턴 수
  family?: SpeciesFamily;
  cooldown?: number;
}

// 보스·야생·서바이벌 직접 전투가 같이 쓰는 화면 데이터. state.bossHp는 보스뿐 아니라 상대(야생 개체·엘리트)의 현재 HP다.
export interface DuelCoreView {
  patterns: BossPatternInfo[];
  mine: BattleFighter;
  enemy: BattleFighter;
  rules?: BattleRules | null; // 서바이벌 엘리트 전투는 상성만 있다(환경 null)
  maxTurns: number;
  state: {
    turn: number;
    myHp: number;
    bossHp: number;
    enraged: boolean;
    charged: boolean;
    strikeCooldown: number;
    healUsed: boolean;
    // 계열 기술: 다시 쓸 수 있을 때까지 남은 턴, 상대에게 걸린 화상(불꽃)·속박(숲)이 남은 턴. 예전 응답에는 없을 수 있다.
    skillCooldown?: number;
    burnTurns?: number;
    rootTurns?: number;
  };
  // 이번 턴에 상대가 하려는 일(강타·웅크리기는 미리 알 수 있다)
  intent: { heavy: boolean; guard: boolean };
  actions: DuelActionView[];
  log: BattleTurn[];
}

export interface BossDuelView extends DuelCoreView {
  floor: number;
  isBoss: boolean;
  difficulty: BossDifficultyInfo;
}

// 야생 배틀 직접 전투. 상대 개체에게는 패턴이 없다.
export interface WildDuelView extends DuelCoreView {
  difficulty: number;
}

// 서바이벌 엘리트 직접 전투
export interface SurvivalDuelView extends DuelCoreView {
  stage: number;
  isElite: boolean;
}

export interface BossDuelTurnResponse {
  gameState: GameState;
  message?: string;
  duel: BossDuelView;
  turns: BattleTurn[]; // 방금 일어난 일(내 행동, 보스 행동)
  finished: false;
}

// 전투가 끝나면 자동 전투와 같은 결과 응답에 finished: true가 붙는다.
export type BossDuelEndResponse = BossBattleResponse & { finished: true; duel: null; turns: BattleTurn[] };
export type BossDuelActResponse = BossDuelTurnResponse | BossDuelEndResponse;

export interface WildDuelTurnResponse {
  gameState: GameState;
  message?: string;
  duel: WildDuelView;
  turns: BattleTurn[];
  finished: false;
}
export type WildDuelEndResponse = BattleResponse & { finished: true; duel: null; turns: BattleTurn[] };
export type WildDuelActResponse = WildDuelTurnResponse | WildDuelEndResponse;

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

// ---- 오늘의 퍼즐 "굴러라 콩벌레" ----
export type PuzzleMove = 'U' | 'D' | 'L' | 'R';

export interface PuzzleCell {
  x: number;
  y: number;
}

export interface PuzzleBoardInfo {
  dayKey: string; // YYYY-MM-DD(한국 시간)
  stage: number; // 1~10
  width: number;
  height: number;
  rocks: PuzzleCell[];
  start: PuzzleCell;
  goal: PuzzleCell; // 나뭇잎
  par: number; // 이 판의 최단 이동 수
}

export interface PuzzleRewardInfo {
  explorationTickets: number;
  equipmentShards: number;
  diamonds: number;
}

// 단계별 오늘의 기록. 아직 열리지 않은 단계는 par가 null이다.
export interface PuzzleStageSummary {
  stage: number;
  unlocked: boolean;
  par: number | null;
  bestMoves: number | null;
  stars: number; // 오늘 이 단계에서 딴 가장 높은 별(못 깼으면 0)
  rewardedStars: number; // 이미 보상을 받은 별 단계
}

export interface PuzzleMilestoneInfo {
  stages: number; // 오늘 N단계까지 깼을 때
  reward: PuzzleRewardInfo;
}

export interface PuzzleInfo {
  puzzle: PuzzleBoardInfo; // 고른 단계의 판(기본은 지금 도전할 단계)
  openStage: number; // 지금 도전할 수 있는 가장 높은 단계
  allCleared: boolean;
  stages: PuzzleStageSummary[];
  resetsAt: number; // 다음 퍼즐이 나오는 시각(ms)
  maxMoves: number;
  milestoneReached: number; // 오늘 이미 받은 단계 달성 보너스 중 가장 높은 단계
  today: { cleared: number; excess: number; rank: number; participants: number } | null;
  yesterday: {
    dayKey: string;
    cleared: number;
    excess: number;
    rank: number;
    participants: number;
    diamonds: number; // 받을 수 있는 순위 보상(0이면 없음)
    claimed: boolean;
  } | null;
  rules: {
    stageCount: number;
    star2Margin: number;
    stageShards: number[]; // 인덱스 = 그 단계에서 딴 별 수, 값 = 받는 장비 조각(차액 지급)
    milestones: PuzzleMilestoneInfo[];
    rankRewards: { maxRank: number; diamonds: number }[];
  };
}

export interface PuzzleSubmitResponse {
  gameState: GameState;
  message: string;
  stage: number;
  moves: number;
  stars: number;
  par: number;
  improved: boolean; // 이 단계 최고 기록을 갱신했는지
  stageBest: number;
  bestStars: number;
  cleared: number; // 오늘 이어서 깬 단계 수
  excess: number; // 깬 단계들의 최단 수 초과분 합
  nextStage: number | null; // 다음에 도전할 단계(모두 깼으면 null)
  allCleared: boolean;
  rank: number;
  participants: number;
  reward: PuzzleRewardInfo; // 이번에 새로 받은 보상 합계(없으면 모두 0)
  stageReward: PuzzleRewardInfo;
  milestones: PuzzleMilestoneInfo[]; // 이번에 새로 달성한 단계 달성 보너스
}

export interface PuzzleClaimResponse {
  gameState: GameState;
  message: string;
  diamonds: number;
  rank: number;
}

// ---- 콩 달리기 ----
export interface RunnerRewardInfo {
  explorationTickets: number;
  equipmentShards: number;
  diamonds: number;
}

export interface RunnerMilestoneInfo {
  meters: number; // 오늘 최고 기록이 이 거리에 닿으면
  reward: RunnerRewardInfo;
}

export interface RunnerInfo {
  dayKey: string;
  today: { bestMeters: number; rank: number; participants: number } | null;
  bestMeters: number; // 지금까지의 최고 기록
  milestoneReached: number; // 오늘 이미 받은 거리 보너스 개수
  resetsAt: number;
  rules: {
    tps: number;
    maxTicks: number;
    milestones: RunnerMilestoneInfo[];
    abilities: RunnerAbilityInfo[]; // 인덱스 = 희귀도
    invulnTicks: number;
    airJumpPercent: number;
  };
}

// 콩벌레(종)의 희귀도에 따른 능력
export interface RunnerAbilityInfo {
  shields: number; // 곰팡이에 부딪혀도 버티는 횟수
  jumpBoostPercent: number; // 점프력 +%
  airJumps: number; // 공중에서 더 뛸 수 있는 횟수
}

export interface RunnerStartResponse {
  seed: number;
  maxTicks: number;
  speciesId: string;
  rarity: number;
}

export interface RunnerFinishResponse {
  gameState: GameState;
  message: string;
  meters: number;
  ticks: number;
  completed: boolean; // 쓰러지지 않고 끝까지(6분) 달렸는가
  speciesId: string;
  rarity: number;
  shieldsUsed: number; // 곰팡이를 막아 준 껍질 수
  improved: boolean; // 오늘 최고 기록을 갱신했는지
  bestToday: number;
  bestMeters: number;
  newAllTimeBest: boolean;
  rank: number;
  participants: number;
  reward: RunnerRewardInfo;
  milestones: RunnerMilestoneInfo[];
}

// ---- 숲 신문 ----
export interface NewsArticleView {
  id: string;
  section: '날씨' | '발견' | '도전' | '랭킹' | '소식';
  icon: string;
  headline: string;
  body: string;
}

export interface NewsEditionView {
  dayKey: string;
  yesterday: string;
  headline: NewsArticleView | null;
  articles: NewsArticleView[];
}

// ---- 전투 레벨 각성 ★ ----
export interface AwakenSpeciesView {
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  rarity: number;
  family: SpeciesFamily;
  owned: boolean;
  level: number;
  xp: { current: number; required: number };
  stars: number;
  bonus: number; // ★로 늘어난 능력치 비율(0.4면 +40%)
  next: { gold: number; diamonds: number } | null; // 다음 ★ 비용(최고면 null)
  ready: boolean; // 지금 각성할 수 있는지(키우는 중 + 레벨 충족 + ★ 여유)
  afford: boolean; // 골드·다이아가 충분한지
}

export interface AwakenStatus {
  coins: number;
  diamonds: number;
  requiredLevel: number;
  maxStars: number;
  starBonus: number;
  species: AwakenSpeciesView[];
}

export interface AwakenResponse extends ActionResult {
  status: AwakenStatus;
}

// ---- 떠돌이 상인 ----
export interface MerchantItemView {
  id: 'ticket' | 'shard' | 'boost' | 'decor';
  kind: 'ticket' | 'shard' | 'boost' | 'decor';
  name: string;
  icon: string;
  desc: string;
  tag: string;
  amount: number;
  limit: number; // 하루에 살 수 있는 개수
  bought: number;
  left: number; // 오늘 더 살 수 있는 개수(이미 가진 장식은 0)
  alreadyOwned: boolean;
  base: number; // 기준 가격
  multiplier: number; // 달·날씨 배율
  price: number; // 오늘 가격(특가 반영)
  sale: boolean;
  verdict: 'sale' | 'cheap' | 'normal' | 'pricey';
}

export interface MerchantStatus {
  day: string;
  resetsInMs: number;
  coins: number;
  moon: { name: string; icon: string; fraction: number };
  weather: { name: string; icon: string } | null;
  items: MerchantItemView[];
}

export interface MerchantResponse extends ActionResult {
  status: MerchantStatus;
}

// ---- 표본 전시관 ----
export interface ExhibitSpeciesView {
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  rarity: number;
  family: SpeciesFamily;
  owned: boolean; // 지금 키우고 있는지(표본을 만들려면 키우고 있어야 한다)
  tier: number; // 0이면 표본 없음, 1~4
  tierName: string;
  score: number;
  shown: boolean;
  next: { tier: number; tierName: string; gold: number } | null; // 다음 등급을 만드는 값(최고 등급이면 null)
}

export interface ExhibitStatus {
  coins: number;
  tiers: { tier: number; id: string; name: string; icon: string; points: number }[];
  slots: number;
  used: number;
  shelfLevel: number;
  maxShelfLevel: number;
  shelfNext: { slots: number; gold: number } | null;
  score: number;
  shownIds: string[];
  species: ExhibitSpeciesView[];
}

export interface ExhibitResponse extends ActionResult {
  status: ExhibitStatus;
}

// ---- 사육장 관리인 ----
export interface ManagerGradeView {
  id: string;
  name: string;
  icon: string;
  wage: number; // 하루 월급(골드)
  incomeBonus: number; // 자동 수익 +비율
}

export interface ManagerStatus {
  today: string;
  coins: number;
  hourlyIncome: number;
  maxCatchupDays: number;
  grades: ManagerGradeView[];
  current: { grade: string; name: string; icon: string; incomeBonus: number; wage: number; paidThrough: string; owedDays: number; totalPaid: number; hiredAt: number } | null;
  totalPaid: number;
}

export interface ManagerResponse extends ActionResult {
  status: ManagerStatus;
}

// ---- 장비 각인 재련소 ----
export interface EngraveInfoView {
  kind: string;
  name: string;
  icon: string;
  grade: number;
  gradeName: string;
  value: number;
  unit: string;
  text: string;
}

export interface EngraveItemView {
  itemId: string;
  name: string;
  icon: string;
  rarity: number;
  category: 'weapon' | 'armor' | 'charm';
  equipped: boolean;
  current: EngraveInfoView | null;
  pending: EngraveInfoView | null; // 굴려서 나왔지만 아직 고르지 않은 새 각인
  cost: { gold: number; shards: number };
}

export interface EngraveStatus {
  shards: number;
  kinds: { id: string; name: string; icon: string; desc: string; unit: string; values: number[]; cap: number }[];
  grades: { id: string; name: string; rate: number }[];
  totals: { matchup: number; skillCd: number; postHeal: number; xp: number };
  items: EngraveItemView[];
}

export interface EngraveResponse extends ActionResult {
  status: EngraveStatus;
  rolled?: EngraveInfoView | null;
}

// ---- 계열 기술 연구소 ----
export interface SkillLabNodeView {
  id: string;
  name: string;
  icon: string;
  desc: string;
  max: number;
  level: number;
  next: { gold: number; diamonds: number } | null; // 최고 단계면 null
}

export interface SkillLabFamilyView {
  family: SpeciesFamily;
  name: string;
  icon: string;
  skillName: string;
  nodes: SkillLabNodeView[];
}

export interface SkillLabStatus {
  families: SkillLabFamilyView[];
}

export interface SkillLabResponse extends ActionResult {
  status: SkillLabStatus;
}

// ---- 매일 경매 ----
export interface AuctionItemInfo {
  name: string;
  icon: string;
  description: string;
  tag: string;
}

export interface AuctionLotView extends AuctionItemInfo {
  lot: number;
  kind: 'equipment' | 'decor' | 'boost';
  minBid: number;
  nextMin: number;
  top: { amount: number; displayName: string; isMe: boolean } | null;
  bids: number;
  mine: 'leading' | 'outbid' | 'none';
  myBid: number;
  alreadyOwned: boolean;
  history: { displayName: string; amount: number; at: number; isMe: boolean }[];
}

export interface AuctionStatus {
  day: string;
  closesAt: number;
  endsInMs: number;
  coins: number;
  lots: AuctionLotView[];
  yesterday: { day: string; lots: (AuctionItemInfo & { lot: number; winner: { displayName: string; amount: number; isMe: boolean } | null })[] } | null;
  pending: { refund: number; won: (AuctionItemInfo & { day: string; lot: number; amount: number })[] };
  rules: { minIncrement: number; incrementRate: number };
}

export interface AuctionResponse extends ActionResult {
  status: AuctionStatus;
}

// ---- 오늘의 운세 ----
export interface FortuneView {
  grade: { id: string; name: string; icon: string };
  family: SpeciesFamily;
  familyName: string;
  familyIcon: string;
  color: { name: string; icon: string };
  number: number;
  line: string;
  reward: { gold: number; diamonds: number; tickets: number };
  rewardText: string;
  effects: { breedPercent: number; exploreMult: number };
}

export interface FortuneStatus {
  today: string;
  drawn: boolean;
  resetsInMs: number;
  fortune: FortuneView | null;
  streak: number;
  best: number;
  nextBonusIn: number;
  streakEvery: number;
  streakBonusText: string;
  grades: { id: string; name: string; icon: string; rate: number; rewardText: string; breedPercent: number; exploreMult: number }[];
}

export interface FortuneDrawResponse extends ActionResult {
  status: FortuneStatus;
}

// ---- 계절 이벤트 ----
export interface SeasonalDecorView {
  decorId: string;
  name: string;
  icon: string;
  kind: DecorKind;
  tier: 0 | 1 | 2;
  price: number;
  description: string;
  owned: boolean;
}

export interface SeasonalEventBase {
  id: string;
  name: string;
  icon: string;
  family: SpeciesFamily;
  from: string;
  to: string;
}

export interface SeasonalActiveEvent extends SeasonalEventBase {
  flavor: string;
  daysLeft: number;
  exploreWeight: number;
  giftId: string;
  giftClaimed: boolean;
  gift: { gold: number; diamonds: number; tickets: number };
  giftText: string;
  decor: SeasonalDecorView[];
}

export interface SeasonalStatus {
  today: string;
  active: SeasonalActiveEvent[];
  upcoming: (SeasonalEventBase & { flavor: string; daysUntil: number })[];
  calendar: (SeasonalEventBase & { state: 'past' | 'active' | 'upcoming' })[];
  ownedLimited: number;
  totalLimited: number;
}

export interface SeasonalGiftResponse extends ActionResult {
  status: SeasonalStatus;
}

// ---- 숲 복원 프로젝트 ----
export interface RestorationRewardView {
  gold: number;
  diamonds: number;
  tickets: number;
}

export interface RestorationMilestoneView {
  id: string;
  percent: number;
  points: number;
  reward: RestorationRewardView;
  rewardText: string;
  reached: boolean;
  claimed: boolean;
  claimable: boolean;
}

export interface RestorationPersonalView {
  id: string;
  points: number;
  reward: RestorationRewardView;
  rewardText: string;
  reached: boolean;
  claimed: boolean;
  claimable: boolean;
}

export interface RestorationStatus {
  week: string;
  endsInMs: number;
  goal: number;
  points: number;
  ratio: number;
  stage: { id: string; icon: string; name: string; desc: string };
  contributors: number;
  counts: { explores: number; expeditions: number; battles: number; dungeons: number };
  my: { points: number; dayPoints: number; dayCap: number; todayLeft: number };
  milestones: RestorationMilestoneView[];
  personal: RestorationPersonalView[];
  claimable: number;
  board: { rank: number; displayName: string; points: number; isMe: boolean }[];
  lastWeek: {
    week: string;
    goal: number;
    points: number;
    ratio: number;
    myPoints: number;
    milestones: RestorationMilestoneView[];
    personal: RestorationPersonalView[];
    claimable: number;
  } | null;
  rules: { explore: number; expedition: number; battleWin: number; battleLose: number; dungeonPerFiveFloors: number; dungeonMax: number; dailyCap: number };
}

export interface RestorationClaimResponse extends ActionResult {
  reward: RestorationRewardView;
  status: RestorationStatus;
}

// ---- 이 콩 누구? ----
export interface QuizQuestionView {
  index: number;
  mode: 'silhouette' | 'zoom' | 'zoomShadow';
  zoom: { scale: number; x: number; y: number };
  choices: { speciesId: string; name: string }[];
  limitMs: number;
  imageUrl: string;
}

export interface QuizInfo {
  dayKey: string;
  today: { bestStreak: number; rank: number; participants: number } | null;
  bestStreak: number;
  milestoneReached: number;
  resetsAt: number;
  run: { streak: number; question: QuizQuestionView | null; remainingMs: number } | null;
  rules: { startMs: number; stepMs: number; minMs: number; graceMs: number; milestones: { streak: number; reward: { explorationTickets: number; diamonds: number } }[] };
}

export interface QuizStartResponse {
  streak: number;
  question: QuizQuestionView | null;
}

export interface QuizAnswerResponse extends ActionResult {
  correct: boolean;
  over: boolean;
  timedOut?: boolean;
  streak: number;
  answer: { speciesId: string; name: string; image?: string; filter: string };
  next: QuizQuestionView | null;
  ended: {
    streak: number;
    rank: number | null;
    participants: number | null;
    reward: { explorationTickets: number; diamonds: number };
    milestones: { streak: number; reward: { explorationTickets: number; diamonds: number } }[];
    bestStreak: number;
    newAllTimeBest: boolean;
    improved: boolean;
  } | null;
}

// ---- 버섯 가게 운영 ----
export type ShopProductId = 'shiitake' | 'oyster' | 'matsutake';

export interface ShopProductInfo {
  id: ShopProductId;
  name: string;
  icon: string;
  cost: number;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  sensitivity: string;
  weatherMult: number;
  expectedCustomers: number;
}

export interface ShopPlanItem {
  productId: ShopProductId;
  stock: number;
  price: number;
}

export interface ShopLine extends ShopPlanItem {
  customers: number;
  sold: number;
  wasted: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ShopSimInfo {
  dayKey: string;
  resetsAt: number;
  weather: { type: string; name: string; icon: string; flavor: string };
  budget: number;
  maxStock: number;
  products: ShopProductInfo[];
  today: { played: false } | { played: true; efficiency: number; profit: number; rank: number | null; plan: ShopPlanItem[] };
  participants: number;
  board: { rank: number; userId: string; displayName: string; isMe: boolean; efficiency: number; profit: number }[];
  rewards: { efficiency: number; gold: number; explorationTickets: number; diamonds: number }[];
}

export interface ShopSimRunResponse extends ActionResult {
  practice: boolean;
  weather: { type: string; name: string; icon: string };
  result: { lines: ShopLine[]; revenue: number; cost: number; profit: number };
  efficiency: number;
  optimum: { plan: ShopPlanItem[]; profit: number };
  reward: { gold: number; explorationTickets: number; diamonds: number } | null;
  rank: number | null;
  participants: number | null;
}

// ---- 콩 쌓기 ----
export interface StackRewardInfo {
  explorationTickets: number;
  equipmentShards: number;
  diamonds: number;
}

export interface StackInfo {
  dayKey: string;
  today: { bestHeight: number; rank: number; participants: number } | null;
  bestHeight: number;
  milestoneReached: number;
  resetsAt: number;
  rules: {
    tps: number;
    range: number;
    startWidth: number;
    maxHeight: number;
    minDelay: number;
    maxDelay: number;
    speedStart: number;
    speedMax: number;
    speedEvery: number;
    grow: number;
    growStreak: number;
    toleranceByRarity: number[];
    milestones: { height: number; reward: StackRewardInfo }[];
  };
}

export interface StackStartResponse {
  seed: number;
  speciesId: string;
  rarity: number;
}

export interface StackFinishResponse extends ActionResult {
  height: number;
  perfects: number;
  ticks: number;
  completed: boolean;
  speciesId: string;
  rarity: number;
  improved: boolean;
  bestToday: number;
  bestHeight: number;
  newAllTimeBest: boolean;
  rank: number;
  participants: number;
  reward: StackRewardInfo;
  milestones: { height: number; reward: StackRewardInfo }[];
}

// ---- 하극상 대회(희귀도 '일반' 전용 주간 대회) ----
export interface UnderdogFighterOption {
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  family?: SpeciesFamily;
  level: number;
}

export interface UnderdogMe {
  speciesId: string;
  points: number;
  wins: number;
  losses: number;
  matches: number;
  matchesLeft: number;
  rank: number | null;
}

export interface UnderdogBoardRow {
  rank: number;
  userId: string;
  displayName: string;
  isMe: boolean;
  points: number;
  wins: number;
  losses: number;
  speciesId: string;
  speciesName: string;
  image?: string;
  filter: string;
}

export interface UnderdogReward {
  rank?: number;
  gold: number;
  diamonds: number;
  label: string;
}

export interface UnderdogStatus {
  week: string;
  weekEndsInMs: number;
  rules: {
    dailyMatches: number;
    winPoints: number;
    winLevelBonusMax: number;
    lossPoints: number;
    npcRate: number;
    winGold: number;
    minMatchesForReward: number;
    rewards: UnderdogReward[];
  };
  me: UnderdogMe | null;
  eligible: UnderdogFighterOption[];
  board: UnderdogBoardRow[];
  participants: number;
  lastWeek: {
    week: string;
    rank: number | null;
    participants: number;
    points: number;
    wins: number;
    losses: number;
    matches: number;
    reward: UnderdogReward | null;
    claimed: boolean;
    claimable: boolean;
  } | null;
}

export interface UnderdogOpponent {
  userId: string; // 야생 선수면 빈 문자열
  npc: boolean;
  displayName: string;
  speciesId: string;
  speciesName: string;
  image?: string;
  filter: string;
  level: number;
  points: number;
}

export interface UnderdogMatchResponse extends ActionResult {
  result: {
    won: boolean;
    vsNpc: boolean;
    pointsDelta: number;
    gold: number;
    log: BattleTurn[];
    mine: BattleFighter;
    opponent: BattleFighter & { displayName: string; speciesName: string };
  };
  status: UnderdogStatus;
}

export interface UnderdogStatusResponse extends ActionResult {
  status: UnderdogStatus;
}

// ---- 현상수배 보스 ----
export type WantedTierId = 'bronze' | 'silver' | 'gold';

export interface WantedConditionView {
  kind: 'family' | 'rarityMax' | 'noEquipment' | 'levelCap' | 'ban';
  text: string;
}

export interface WantedTierView {
  id: WantedTierId;
  name: string;
  icon: string;
  stage: number;
  gold: number;
  diamonds: number;
  cleared: boolean;
  stats: CombatStats;
  patterns: BossPatternInfo[];
}

export interface WantedFighterView {
  speciesId: string;
  eligible: boolean;
  reason: string | null;
  level: number;
  effectiveLevel: number;
}

export interface WantedPosterEntry {
  day: string;
  tier: WantedTierId;
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  rarity: number;
}

export interface WantedStatus {
  poster: {
    day: string;
    boss: { speciesId: string; name: string; image?: string; filter: string; rarity: number; family: SpeciesFamily } | null;
    environment: 'plain' | 'volcano' | 'jungle' | 'tundra';
    conditions: WantedConditionView[];
    tiers: WantedTierView[];
  };
  attempts: { used: number; limit: number; left: number };
  fighters: WantedFighterView[];
  duel: (DuelCoreView & { tier: WantedTierId }) | null;
  collection: {
    total: number;
    posters: WantedPosterEntry[];
    milestones: { count: number; diamonds: number; claimed: boolean; reached: boolean }[];
  };
}

export interface WantedResult {
  won: boolean;
  tier: WantedTierId;
  gold: number;
  diamonds: number;
  milestoneDiamonds: number;
  newPoster: boolean;
}

export interface WantedResponse extends ActionResult {
  status: WantedStatus | null;
  step?: boolean; // 전투가 이어지는 중간 응답
  turns?: BattleTurn[];
  battleLog?: BattleTurn[];
  result: WantedResult | null;
}

// ---- 썩은 통나무 던전(로그라이크) ----
export type DungeonDifficultyId = 'easy' | 'normal' | 'hard' | 'harder' | 'extreme';
export type DungeonRoomType = 'battle' | 'elite' | 'rest' | 'shop' | 'event' | 'treasure' | 'boss';
export type DungeonPhase = 'choose' | 'duel' | 'reward' | 'event' | 'shop' | 'rest';

export interface DungeonRelicView {
  relicId: string;
  name: string;
  icon: string;
  tier: 0 | 1 | 2; // 일반 / 희귀 / 에픽
  description: string;
  maxStacks: number; // 한 런에서 겹쳐 가질 수 있는 최대 개수(효과가 개수만큼 쌓인다)
  count?: number; // 가진 유물 목록: 지금 가진 개수
  owned?: number; // 제안·상점: 이미 가진 개수
}

// 엘리트 층을 지키는 다른 유저의 문지기
export interface DungeonGuardianSlot {
  ownerName: string;
  speciesId: string;
  speciesName: string;
  image?: string;
  filter: string;
  rarity: number;
}

export interface DungeonRoomOption {
  index: number;
  type: DungeonRoomType;
  name: string;
  icon: string;
  description: string;
  family?: SpeciesFamily; // 전투·엘리트·보스 방: 적 계열
  environment?: 'plain' | 'volcano' | 'jungle' | 'tundra';
  guardian?: DungeonGuardianSlot; // 다른 유저의 문지기가 지키는 엘리트 방
}

export interface DungeonEventView {
  eventId: string;
  title: string;
  icon: string;
  text: string;
  choices: { id: string; label: string; hint: string; disabled: boolean }[];
}

export interface DungeonShopView {
  relics: (DungeonRelicView & { price: number; sold: boolean; affordable: boolean })[];
  potion: { price: number; sold: boolean; healRate: number; affordable: boolean };
}

export interface DungeonRunView {
  difficulty: { id: DungeonDifficultyId; name: string; rewardMult: number };
  floor: number; // 지금 층(끝낸 층 + 1)
  cleared: number;
  floors: number;
  phase: DungeonPhase;
  species: { speciesId: string; name: string; image?: string; filter: string; rarity: number; family: SpeciesFamily; level: number };
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  gold: number; // 이번 런의 버섯조각
  relics: DungeonRelicView[];
  bonus: { atk: number; def: number; hp: number };
  revived: boolean;
  skillCooldownReduce: number;
  log: string[];
  options?: DungeonRoomOption[];
  // 출정 준비물: 남은 정찰 지도·방 새로고침, 정찰로 미리 본 마지막 층, 미리 본 앞쪽 층의 방 구성
  supplies?: { scout: number; reroll: number; scoutUntil: number };
  preview?: { floor: number; rooms: { type: DungeonRoomType; name: string; icon: string; description: string; family?: SpeciesFamily }[] }[];
  offer?: DungeonRelicView[];
  offerKind?: string;
  skipGold?: number;
  event?: DungeonEventView;
  shop?: DungeonShopView;
  rest?: { healRate: number; trainBonus: number };
  duel?: DuelCoreView & { kind: 'battle' | 'elite' | 'boss'; isBoss: boolean; guardian: { ownerName: string } | null };
}

// 내가 던전에 세운 문지기 현황과 규칙
export interface DungeonGuardianInfo {
  speciesId: string; // 빈 문자열이면 문지기가 없다
  registeredAt: number;
  blocked: number;
  breached: number;
  tollTotal: number;
  pendingToll: number;
  tollLeftToday: number;
  bountyDiamondsLeftToday: number;
  rules: {
    chance: number;
    tollPerFloor: number;
    tollDailyLimit: number;
    bountyGoldPerFloor: number;
    bountyDiamonds: number;
    bountyDailyDiamonds: number;
  };
}

// 입장하기 전에 골드나 다이아로 사는 일회용 출정 준비물
export type DungeonSupplyId = 'relic' | 'mushrooms' | 'scout' | 'reroll';
export type DungeonSupplyChoice = Record<DungeonSupplyId, number>;
export interface DungeonSupplyInfo {
  id: DungeonSupplyId;
  name: string;
  icon: string;
  desc: string;
  max: number;
  diamonds: number;
  gold: Record<DungeonDifficultyId, number>; // 난이도별 골드 가격
}

export interface DungeonInfo {
  dailyRuns: number;
  attemptsLeft: number;
  floors: number;
  chapter: number; // 한 장의 층 수(5층 엘리트, 마지막 층 보스)
  chapterBonus: number; // 장 보스를 이길 때마다 오르는 공격·방어·체력 비율
  milestones: { floor: number; diamonds: number }[]; // 처음 넘으면 다이아를 주는 층
  difficulties: { id: DungeonDifficultyId; name: string; rewardMult: number }[];
  relics: DungeonRelicView[];
  relicsSeen: string[];
  bestScore: number;
  bestLabel: string | null;
  clears: number;
  rooms: Record<DungeonRoomType, { name: string; icon: string; description: string }>;
  guardian: DungeonGuardianInfo;
  supplies?: DungeonSupplyInfo[];
  lab?: DungeonLabInfo[];
}

// 던전 연구소: 골드와 다이아로 올리는 영구 강화(다음 입장부터 적용)
export interface DungeonLabInfo {
  id: 'offer' | 'shop' | 'hp' | 'rest' | 'gold' | 'discount';
  name: string;
  icon: string;
  desc: string;
  max: number;
  level: number;
  next: { gold: number; diamonds: number } | null; // 최고 단계면 null
}

export interface DungeonGuardianResponse extends ActionResult {
  info: DungeonInfo;
}

export interface DungeonEnded {
  reason: 'cleared' | 'dead' | 'retired';
  difficulty: DungeonDifficultyId;
  floorsCleared: number;
  cleared: boolean;
  gold: number;
  xp: number;
  diamonds: number;
  equipment: { itemId: string; name: string; rarity: number; isNew: boolean; copies: number }[];
  levelBefore: number;
  levelAfter: number;
  newBest: boolean;
  bestLabel: string;
  relics: DungeonRelicView[];
}

export interface DungeonBattleView {
  won: boolean;
  revived?: boolean;
  floor?: number;
  hpBefore?: number;
  hpAfter?: number;
  enemy?: { speciesId: string; name: string; image?: string; filter: string; rarity: number; stats: CombatStats; family: SpeciesFamily };
  rules?: BattleRules | null;
  log: BattleTurn[];
}

export interface DungeonStatus {
  run: DungeonRunView | null;
  info: DungeonInfo;
}

export interface DungeonResponse extends DungeonStatus {
  gameState: GameState;
  message: string;
  battle: DungeonBattleView | null;
  turns?: BattleTurn[];
  ended: DungeonEnded | null;
  step?: true; // 직접 전투 중간 응답
}
