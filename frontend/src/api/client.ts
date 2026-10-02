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
  BossCatalog,
  PvpBattleResponse,
  PvpOpponentResult,
  Quest,
  ResolveReportResult,
  Species,
  TrainResponse,
  Upgrade,
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

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const api = {
  googleLoginUrl: () => `${BASE_URL}/auth/google`,
  me: () => request<AuthUser>('/auth/me'),
  setProfileMessage: (message: string) =>
    post<AuthUser>('/auth/profile-message', { message }),

  getSpecies: () => request<Species[]>('/species'),
  getUpgrades: () => request<Upgrade[]>('/upgrades'),
  getQuests: () => request<Quest[]>('/quests'),
  getAchievements: () => request<Achievement[]>('/achievements'),
  getLevelLeaderboard: () => request<LeaderboardResult>('/leaderboard/level'),
  getIncomeLeaderboard: () => request<LeaderboardResult>('/leaderboard/income'),
  getPvpLeaderboard: () => request<LeaderboardResult>('/leaderboard/pvp'),
  getBossLeaderboard: () => request<LeaderboardResult>('/leaderboard/boss'),

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
  getBossCatalog: () => request<BossCatalog>('/boss'),
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
  bossBattle: (speciesId: string, floor: number) =>
    post<BossBattleResponse>('/game-state/boss/battle', { speciesId, floor }),
  explore: (terrariumId?: string, useTicket?: boolean) =>
    post<ActionResult>('/game-state/explore', { terrariumId, useTicket }),
  buyTicket: (quantity = 1) => post<ActionResult>('/game-state/buy-ticket', { quantity }),
  sell: (speciesId: string, quantity: number, terrariumId?: string) =>
    post<ActionResult>('/game-state/sell', { speciesId, quantity, terrariumId }),
  upgrade: (upgradeId: string, terrariumId?: string) =>
    post<ActionResult>('/game-state/upgrade', { upgradeId, terrariumId }),
  addTerrarium: (name?: string) => post<ActionResult>('/game-state/terrariums', { name }),
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
