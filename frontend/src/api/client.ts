import type {
  Achievement,
  ActionResult,
  AdminChatBan,
  AdminChatReportList,
  AdminMailHistoryItem,
  AdminMailRequest,
  AdminMailSendResult,
  AdminStats,
  AdminUserSearchResult,
  BattleResponse,
  CareAction,
  ChatChannel,
  ChatMessage,
  EquipmentAwakenResponse,
  EquipmentCatalogItem,
  EquipmentPullResponse,
  ChatReportReason,
  FriendChatMessage,
  FriendChatPoll,
  FriendChatUnread,
  FriendSearchResult,
  FriendsListResult,
  GameState,
  LeaderboardResult,
  MailClaimResult,
  NotificationPrefs,
  MailListResult,
  MailSummary,
  OnlinePlayersResult,
  PublicProfile,
  PushConfig,
  BossBattleResponse,
  BossDuelActResponse,
  BossDuelEndResponse,
  BossDuelTurnResponse,
  BossDuelView,
  BoostKind,
  SurvivalDuelStepResponse,
  WildDuelActResponse,
  WildDuelEndResponse,
  WildDuelTurnResponse,
  WildDuelView,
  BoostShop,
  BossCatalog,
  BuyAttemptResponse,
  BuyBoostResponse,
  DecorCatalog,
  DecorKind,
  DuelActionId,
  DungeonGuardianResponse,
  DungeonSupplyChoice,
  WantedResponse,
  WantedStatus,
  NewsEditionView,
  AuctionResponse,
  EngraveResponse,
  AwakenResponse,
  AwakenStatus,
  ExhibitResponse,
  MerchantResponse,
  MerchantStatus,
  ExhibitStatus,
  ManagerResponse,
  ManagerStatus,
  EngraveStatus,
  SkillLabResponse,
  SkillLabStatus,
  AuctionStatus,
  FortuneDrawResponse,
  FortuneStatus,
  RestorationClaimResponse,
  SeasonalGiftResponse,
  SeasonalStatus,
  RestorationStatus,
  QuizAnswerResponse,
  QuizInfo,
  QuizStartResponse,
  ShopPlanItem,
  ShopSimInfo,
  ShopSimRunResponse,
  StackFinishResponse,
  StackInfo,
  StackStartResponse,
  UnderdogMatchResponse,
  UnderdogOpponent,
  UnderdogStatus,
  UnderdogStatusResponse,
  DungeonResponse,
  DungeonStatus,
  DismantleResponse,
  ExpeditionInfo,
  ExpeditionResponse,
  ShardLevelUpResponse,
  BossDifficultyId,
  PuzzleClaimResponse,
  RunnerFinishResponse,
  RunnerInfo,
  RunnerStartResponse,
  PuzzleInfo,
  PuzzleSubmitResponse,
  PvpBattleResponse,
  PvpOpponentResult,
  Quest,
  ResolveReportResult,
  Species,
  SkipCooldownResponse,
  SurvivalInfo,
  SurvivalMode,
  SurvivalResponse,
  SurvivalStatus,
  TrainResponse,
  Upgrade,
  VisitResult,
  VisitSummary,
  WeatherInfo,
} from './types';
import { authStorage } from '../auth/authStorage';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export interface AuthUser {
  _id: string;
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  profileMessage?: string;
  createdAt?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = authStorage.getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    authStorage.clearToken();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `요청에 실패했어요. (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const leaderboardPath = (name: string, limit?: number) => `/leaderboard/${name}${limit ? `?limit=${limit}` : ''}`;

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

// 직접 전투 행동 요청 본문: 리듬 일격의 정확도가 있으면 같이 보낸다(서버가 0~1 범위 안에서만 인정한다).
const rhythmBody = (action: string, rhythm?: number) => (rhythm === undefined ? { action } : { action, rhythm });

export const api = {
  googleLoginUrl: () => `${BASE_URL}/auth/google`,
  me: () => request<AuthUser>('/auth/me'),
  setProfileMessage: (message: string) =>
    post<AuthUser>('/auth/profile-message', { message }),

  getSpecies: () => request<Species[]>('/species'),
  getUpgrades: () => request<Upgrade[]>('/upgrades'),
  getQuests: () => request<Quest[]>('/quests'),
  getAchievements: () => request<Achievement[]>('/achievements'),
  // limit: 보여줄 인원 수(20·50·100). 안 주면 서버 기본값(20명)이다.
  getLevelLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('level', limit)),
  getIncomeLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('income', limit)),
  getPvpLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('pvp', limit)),
  getBossLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('boss', limit)),
  getSurvivalLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('survival', limit)),
  getPuzzleLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('puzzle', limit)),
  getDungeonLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('dungeon', limit)),
  getLikesLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('likes', limit)),

  getGameState: () => request<GameState>('/game-state'),
  getPublicProfile: (userId: string) => request<PublicProfile>(`/game-state/profile/${userId}`),

  advance: (seconds: number) => post<ActionResult>('/game-state/advance', { seconds }),
  care: (action: CareAction, terrariumId?: string) =>
    post<ActionResult>('/game-state/care', { action, terrariumId }),
  observe: (speciesId: string) => post<ActionResult>('/game-state/observe', { speciesId }),
  collect: () => post<ActionResult>('/game-state/collect'),
  battle: (speciesId: string, difficulty: number) =>
    post<BattleResponse>('/game-state/battle', { speciesId, difficulty }),
  train: (speciesId: string, intensity: number, extreme?: boolean) =>
    post<TrainResponse>('/game-state/train', { speciesId, intensity, extreme }),
  getEquipmentCatalog: () => request<EquipmentCatalogItem[]>('/equipment'),
  getDecorCatalog: () => request<DecorCatalog>('/decor'),
  buyDecor: (decorId: string) => post<ActionResult>('/game-state/decor/buy', { decorId }),
  // decorId를 안 주면 그 칸을 비운다. 소품은 index(0~3)로 칸을 가리킨다.
  placeDecor: (terrariumId: string, kind: DecorKind, index: number | undefined, decorId?: string) =>
    post<ActionResult>('/game-state/decor/place', { terrariumId, kind, index, decorId }),
  setTerrariumPublic: (isPublic: boolean) => post<ActionResult>('/game-state/decor/public', { isPublic }),
  getVisit: (userId: string) => request<VisitResult>(`/visit/${userId}`),
  getRandomVisit: () => request<{ userId: string }>('/visit/random'),
  getVisitSummary: () => request<VisitSummary>('/visit/summary'),
  getWeather: () => request<WeatherInfo>('/weather'),
  setTerrariumLike: (ownerId: string, terrariumId: string, liked: boolean) =>
    post<{ liked: boolean; likes: number }>(`/visit/${ownerId}/like`, { terrariumId, liked }),
  getBossCatalog: () => request<BossCatalog>('/boss'),
  getSurvivalInfo: () => request<SurvivalInfo>('/survival'),
  pullEquipment: (count: 1 | 10) =>
    post<EquipmentPullResponse>('/game-state/equipment/pull', { count }),
  levelUpEquipment: (itemId: string) =>
    post<ActionResult>('/game-state/equipment/level-up', { itemId }),
  awakenEquipment: (itemId: string) =>
    post<EquipmentAwakenResponse>('/game-state/equipment/awaken', { itemId }),
  equipEquipment: (slotIndex: number, itemId: string) =>
    post<ActionResult>('/game-state/equipment/equip', { slotIndex, itemId }),
  expandEquipmentSlots: () => post<ActionResult>('/game-state/equipment/expand-slot'),
  setPvpDefense: (speciesId: string) =>
    post<ActionResult>('/game-state/pvp/defense', { speciesId }),
  getPvpOpponent: () => request<PvpOpponentResult>('/game-state/pvp/opponent'),
  pvpBattle: (speciesId: string, opponentUserId: string) =>
    post<PvpBattleResponse>('/game-state/pvp/battle', { speciesId, opponentUserId }),
  getNews: () => request<NewsEditionView>('/game-state/news'),
  getAwaken: () => request<AwakenStatus>('/game-state/awaken'),
  awaken: (speciesId: string) => post<AwakenResponse>('/game-state/awaken', { speciesId }),
  getMerchant: () => request<MerchantStatus>('/game-state/merchant'),
  merchantBuy: (itemId: string, count: number) => post<MerchantResponse>('/game-state/merchant/buy', { itemId, count }),
  getExhibit: () => request<ExhibitStatus>('/game-state/exhibit'),
  exhibitCraft: (speciesId: string) => post<ExhibitResponse>('/game-state/exhibit/craft', { speciesId }),
  exhibitDisplay: (speciesId: string, show: boolean) => post<ExhibitResponse>('/game-state/exhibit/display', { speciesId, show }),
  exhibitShelf: () => post<ExhibitResponse>('/game-state/exhibit/shelf'),
  getExhibitionLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('exhibition', limit)),
  getManager: () => request<ManagerStatus>('/game-state/manager'),
  managerHire: (grade: string) => post<ManagerResponse>('/game-state/manager/hire', { grade }),
  managerDismiss: () => post<ManagerResponse>('/game-state/manager/dismiss'),
  getEngrave: () => request<EngraveStatus>('/game-state/engrave'),
  engraveRoll: (itemId: string) => post<EngraveResponse>('/game-state/engrave/roll', { itemId }),
  engraveAccept: (itemId: string) => post<EngraveResponse>('/game-state/engrave/accept', { itemId }),
  engraveDiscard: (itemId: string) => post<EngraveResponse>('/game-state/engrave/discard', { itemId }),
  getSkillLab: () => request<SkillLabStatus>('/game-state/skill-lab'),
  skillLabUpgrade: (id: string) => post<SkillLabResponse>('/game-state/skill-lab/upgrade', { id }),
  getAuction: () => request<AuctionStatus>('/game-state/auction'),
  auctionBid: (lot: number, amount: number) => post<AuctionResponse>('/game-state/auction/bid', { lot, amount }),
  auctionClaim: () => post<AuctionResponse>('/game-state/auction/claim'),
  getFortune: () => request<FortuneStatus>('/game-state/fortune'),
  fortuneDraw: () => post<FortuneDrawResponse>('/game-state/fortune/draw'),
  getSeasonal: () => request<SeasonalStatus>('/game-state/seasonal'),
  seasonalGift: (eventId: string) => post<SeasonalGiftResponse>('/game-state/seasonal/gift', { eventId }),
  getRestoration: () => request<RestorationStatus>('/game-state/restoration'),
  restorationClaim: (id: string, last: boolean) => post<RestorationClaimResponse>('/game-state/restoration/claim', { id, last }),
  getQuiz: () => request<QuizInfo>('/game-state/quiz'),
  quizStart: () => post<QuizStartResponse>('/game-state/quiz/start'),
  quizAnswer: (speciesId: string) => post<QuizAnswerResponse>('/game-state/quiz/answer', { speciesId }),
  getQuizLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('quiz', limit)),
  getShopSim: () => request<ShopSimInfo>('/game-state/shop-sim'),
  shopSimRun: (plan: ShopPlanItem[], practice: boolean) => post<ShopSimRunResponse>('/game-state/shop-sim/run', { plan, practice }),
  getStack: () => request<StackInfo>('/game-state/stack'),
  stackStart: (speciesId: string) => post<StackStartResponse>('/game-state/stack/start', { speciesId }),
  stackFinish: (delays: number[]) => post<StackFinishResponse>('/game-state/stack/finish', { delays }),
  getStackLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('stack', limit)),
  getUnderdog: () => request<UnderdogStatus>('/game-state/underdog'),
  underdogEnter: (speciesId: string) => post<UnderdogStatusResponse>('/game-state/underdog/enter', { speciesId }),
  underdogOpponent: () => request<{ opponent: UnderdogOpponent }>('/game-state/underdog/opponent'),
  underdogMatch: (opponentUserId: string) => post<UnderdogMatchResponse>('/game-state/underdog/match', { opponentUserId }),
  underdogClaim: () => post<UnderdogStatusResponse>('/game-state/underdog/claim'),
  getWanted: () => request<WantedStatus>('/game-state/wanted'),
  wantedStart: (speciesId: string, tier: string) => post<WantedResponse>('/game-state/wanted/start', { speciesId, tier }),
  wantedAct: (action: DuelActionId, rhythm?: number) => post<WantedResponse>('/game-state/wanted/act', rhythmBody(action, rhythm)),
  wantedForfeit: () => post<WantedResponse>('/game-state/wanted/forfeit'),
  getDungeon: () => request<DungeonStatus>('/game-state/dungeon'),
  dungeonStart: (speciesId: string, difficulty: string, supplies?: DungeonSupplyChoice, pay?: 'gold' | 'diamond') =>
    post<DungeonResponse>('/game-state/dungeon/start', { speciesId, difficulty, ...(supplies ? { supplies, pay: pay ?? 'gold' } : {}) }),
  dungeonLabUpgrade: (id: string) => post<DungeonGuardianResponse>('/game-state/dungeon/lab', { id }),
  dungeonScout: () => post<DungeonResponse>('/game-state/dungeon/scout'),
  dungeonReroll: () => post<DungeonResponse>('/game-state/dungeon/reroll'),
  dungeonChoose: (choice: string) => post<DungeonResponse>('/game-state/dungeon/choose', { choice }),
  dungeonDuelAct: (action: DuelActionId, rhythm?: number) => post<DungeonResponse>('/game-state/dungeon/duel/act', rhythmBody(action, rhythm)),
  dungeonRetire: () => post<DungeonResponse>('/game-state/dungeon/retire'),
  setDungeonGuardian: (speciesId: string) => post<DungeonGuardianResponse>('/game-state/dungeon/guardian', { speciesId }),
  claimDungeonToll: () => post<DungeonGuardianResponse>('/game-state/dungeon/guardian/claim'),
  getSurvivalStatus: () => request<SurvivalStatus>('/game-state/survival'),
  survivalStart: (speciesId: string, mode: SurvivalMode = 'auto') =>
    post<SurvivalResponse>('/game-state/survival/start', { speciesId, mode }),
  survivalDuelAct: (action: string, rhythm?: number) =>
    post<SurvivalResponse | SurvivalDuelStepResponse>('/game-state/survival/duel/act', rhythmBody(action, rhythm)),
  getBattleDuel: () => request<{ duel: WildDuelView | null }>('/game-state/battle/duel'),
  battleDuelStart: (speciesId: string, difficulty: number) =>
    post<WildDuelTurnResponse>('/game-state/battle/duel/start', { speciesId, difficulty }),
  battleDuelAct: (action: string, rhythm?: number) => post<WildDuelActResponse>('/game-state/battle/duel/act', rhythmBody(action, rhythm)),
  battleDuelForfeit: () => post<WildDuelEndResponse>('/game-state/battle/duel/forfeit'),
  survivalChoose: (buffId: string) => post<SurvivalResponse>('/game-state/survival/choose', { buffId }),
  survivalRetire: () => post<SurvivalResponse>('/game-state/survival/retire'),
  getBossDuel: () => request<{ duel: BossDuelView | null }>('/game-state/boss/duel'),
  bossDuelStart: (speciesId: string, floor: number, difficulty: BossDifficultyId = 'easy') =>
    post<BossDuelTurnResponse>('/game-state/boss/duel/start', { speciesId, floor, difficulty }),
  bossDuelAct: (action: string, rhythm?: number) => post<BossDuelActResponse>('/game-state/boss/duel/act', rhythmBody(action, rhythm)),
  bossDuelForfeit: () => post<BossDuelEndResponse>('/game-state/boss/duel/forfeit'),
  getExpeditionInfo: () => request<ExpeditionInfo>('/game-state/expedition'),
  expedition: (tier: number, terrariumId?: string) =>
    post<ExpeditionResponse>('/game-state/expedition', { tier, terrariumId }),
  dismantleEquipment: (itemId?: string, count?: number) =>
    post<DismantleResponse>('/game-state/equipment/dismantle', { itemId, count }),
  levelUpEquipmentWithShards: (itemId: string) =>
    post<ShardLevelUpResponse>('/game-state/equipment/level-up-shards', { itemId }),
  getBoostShop: () => request<BoostShop>('/game-state/boosts'),
  buyBoost: (kind: BoostKind, hours: number) => post<BuyBoostResponse>('/game-state/boosts/buy', { kind, hours }),
  survivalRevive: () => post<SurvivalResponse>('/game-state/survival/revive'),
  getRunner: () => request<RunnerInfo>('/game-state/runner'),
  runnerStart: (speciesId: string) => post<RunnerStartResponse>('/game-state/runner/start', { speciesId }),
  runnerFinish: (jumps: number[]) => post<RunnerFinishResponse>('/game-state/runner/finish', { jumps }),
  getRunnerLeaderboard: (limit?: number) => request<LeaderboardResult>(leaderboardPath('runner', limit)),
  getPuzzle: (stage?: number) => request<PuzzleInfo>(stage === undefined ? '/game-state/puzzle' : `/game-state/puzzle?stage=${stage}`),
  puzzleSubmit: (dayKey: string, stage: number, moves: string) =>
    post<PuzzleSubmitResponse>('/game-state/puzzle/submit', { dayKey, stage, moves }),
  puzzleClaimRank: () => post<PuzzleClaimResponse>('/game-state/puzzle/claim-rank'),
  buySurvivalAttempt: () => post<BuyAttemptResponse>('/game-state/survival/buy-attempt'),
  buyBossAttempt: () => post<BuyAttemptResponse>('/game-state/boss/buy-attempt'),
  skipBossCooldown: () => post<SkipCooldownResponse>('/game-state/boss/skip-cooldown'),
  bossBattle: (speciesId: string, floor: number, difficulty: BossDifficultyId = 'easy') =>
    post<BossBattleResponse>('/game-state/boss/battle', { speciesId, floor, difficulty }),
  explore: (terrariumId?: string, useTicket?: boolean) =>
    post<ActionResult>('/game-state/explore', { terrariumId, useTicket }),
  sell: (speciesId: string, quantity: number, terrariumId?: string, confirmLast?: boolean) =>
    post<ActionResult>('/game-state/sell', { speciesId, quantity, terrariumId, confirmLast }),
  setSpeciesLock: (speciesId: string, locked: boolean) =>
    post<ActionResult>('/game-state/species-lock', { speciesId, locked }),
  upgrade: (upgradeId: string, terrariumId?: string) =>
    post<ActionResult>('/game-state/upgrade', { upgradeId, terrariumId }),
  addTerrarium: (name?: string) => post<ActionResult>('/game-state/terrariums', { name }),
  renameTerrarium: (terrariumId: string, name: string) =>
    post<ActionResult>('/game-state/terrariums/rename', { terrariumId, name }),
  moveSpecies: (speciesId: string, fromTerrariumId: string, toTerrariumId: string) =>
    post<ActionResult>('/game-state/move', { speciesId, fromTerrariumId, toTerrariumId }),
  claim: (questId: string) => post<ActionResult>('/game-state/claim', { questId }),
  claimAchievement: (achievementId: string) =>
    post<ActionResult>('/game-state/claim-achievement', { achievementId }),
  setNickname: (nickname: string) =>
    post<ActionResult & { user: AuthUser }>('/game-state/set-nickname', { nickname }),
  setSpeciesNickname: (speciesId: string, nickname: string) =>
    post<ActionResult>('/game-state/species-nickname', { speciesId, nickname }),

  getAdminStats: () => request<AdminStats>('/admin/stats'),
  searchAdminUsers: (query: string) =>
    request<AdminUserSearchResult[]>(`/admin/mail/users?query=${encodeURIComponent(query)}`),
  sendAdminMail: (mail: AdminMailRequest) => post<AdminMailSendResult>('/admin/mail', mail),
  getAdminMailHistory: () => request<AdminMailHistoryItem[]>('/admin/mail'),

  getMails: () => request<MailListResult>('/mail'),
  getMailSummary: () => request<MailSummary>('/mail/summary'),
  readMail: (id: string) => post<{ summary: MailSummary }>(`/mail/${id}/read`),
  claimMail: (id: string) => post<MailClaimResult>(`/mail/${id}/claim`),
  claimAllMail: () => post<MailClaimResult>('/mail/claim-all'),
  deleteMail: (id: string) => request<{ summary: MailSummary }>(`/mail/${id}`, { method: 'DELETE' }),

  getChatMessages: (channel: ChatChannel, afterId?: string) =>
    request<ChatMessage[]>(`/chat/messages?channel=${channel}${afterId ? `&after=${afterId}` : ''}`),
  sendChatMessage: (channel: ChatChannel, text: string) =>
    post<ChatMessage>('/chat/messages', { channel, text }),

  getOnlinePlayers: () => request<OnlinePlayersResult>('/presence/online'),

  getFriendChatUnread: () => request<FriendChatUnread>('/friend-chat/unread'),
  getFriendMessages: (friendId: string, afterId?: string) =>
    request<FriendChatPoll>(`/friend-chat/${friendId}/messages${afterId ? `?after=${afterId}` : ''}`),
  sendFriendMessage: (friendId: string, text: string) =>
    post<FriendChatMessage>(`/friend-chat/${friendId}/messages`, { text }),
  deleteFriendMessage: (friendId: string, messageId: string) =>
    request<{ id: string }>(`/friend-chat/${friendId}/messages/${messageId}`, { method: 'DELETE' }),
  reportFriendMessage: (messageId: string, reason: ChatReportReason, detail?: string) =>
    post<{ message: string }>('/friend-chat/reports', { messageId, reason, detail: detail || undefined }),

  getPushConfig: () => request<PushConfig>('/push/config'),
  subscribePush: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    post<{ ok: boolean }>('/push/subscribe', sub),
  unsubscribePush: (endpoint: string) => post<{ ok: boolean }>('/push/unsubscribe', { endpoint }),

  getAdminChatReports: (status: 'open' | 'handled' | 'all') =>
    request<AdminChatReportList>(`/admin/friend-chat/reports?status=${status}`),
  // banDays: 처리 완료일 때 함께 걸 채팅 정지 일수(0이면 없음), notify: 정지 안내 우편 발송 여부
  resolveAdminChatReport: (
    reportId: string,
    status: 'resolved' | 'dismissed',
    adminNote?: string,
    banDays?: number,
    notify?: boolean,
  ) =>
    post<ResolveReportResult>(`/admin/friend-chat/reports/${reportId}/resolve`, {
      status,
      adminNote,
      banDays: banDays || undefined,
      notify: banDays ? notify : undefined,
    }),
  getAdminChatBans: () => request<AdminChatBan[]>('/admin/chat-bans'),
  liftAdminChatBan: (userId: string) => post<{ userId: string }>(`/admin/chat-bans/${userId}/lift`),

  getNotificationPrefs: () => request<NotificationPrefs>('/push/preferences'),
  updateNotificationPrefs: (patch: Partial<NotificationPrefs>) =>
    post<NotificationPrefs>('/push/preferences', patch),

  getFriends: () => request<FriendsListResult>('/friends'),
  searchFriends: (query: string) =>
    request<FriendSearchResult[]>(`/friends/search?query=${encodeURIComponent(query)}`),
  sendFriendRequest: (targetUserId: string) =>
    post<{ message: string }>('/friends/request', { targetUserId }),
  acceptFriendRequest: (requestId: string) =>
    post<{ message: string }>('/friends/accept', { requestId }),
  declineFriendRequest: (requestId: string) =>
    post<{ message: string }>('/friends/decline', { requestId }),
  removeFriend: (friendUserId: string) =>
    post<{ message: string }>('/friends/remove', { friendUserId }),
  giftFriend: (friendUserId: string) =>
    post<{ message: string }>('/friends/gift', { friendUserId }),
};
