import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type {
  Achievement,
  ActionResult,
  BossCatalog,
  EquipmentCatalogItem,
  FriendChatUnread,
  GameState,
  LeaderboardResult,
  MailSummary,
  NotificationPrefs,
  Quest,
  Species,
  Upgrade,
} from '../api/types';

const TICK_MS = 5000;

export interface ToastState {
  message: string;
  error?: boolean;
  key: number;
}

export function useGameEngine(userKey: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState<EquipmentCatalogItem[]>([]);
  const [bossCatalog, setBossCatalog] = useState<BossCatalog | null>(null);
  const [levelLeaderboard, setLevelLeaderboard] = useState<LeaderboardResult | null>(null);
  const [incomeLeaderboard, setIncomeLeaderboard] = useState<LeaderboardResult | null>(null);
  const [pvpLeaderboard, setPvpLeaderboard] = useState<LeaderboardResult | null>(null);
  const [bossLeaderboard, setBossLeaderboard] = useState<LeaderboardResult | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  // 친구 수(업적 진행도 계산용). 랭킹과 같은 주기로 같이 불러온다.
  const [friendsCount, setFriendsCount] = useState(0);
  // 우편함 배지용 요약. 1분마다 새로 확인하고, 안 읽은 우편이 늘었으면 알려준다.
  const [mailSummary, setMailSummary] = useState<MailSummary>({ unread: 0, claimable: 0, badge: 0 });
  // 친구 채팅의 안 읽은 메시지 수(친구별·전체). 사이드바 배지와 친구 목록에 쓴다.
  const [friendChatUnread, setFriendChatUnread] = useState<FriendChatUnread>({ total: 0, byFriend: {} });
  // 알림 종류별 켜기/끄기. 꺼 둔 종류는 화면 안의 알림(토스트)도 띄우지 않는다(서버는 푸시 알림도 같은 설정으로 거른다).
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({ friendChat: true, mail: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToastState] = useState<ToastState | null>(null);

  const lastTickRef = useRef<number>(0);
  const toastKeyRef = useRef(0);

  const showToast = useCallback((message: string, isError = false) => {
    toastKeyRef.current += 1;
    setToastState({ message, error: isError, key: toastKeyRef.current });
  }, []);

  const reloadLeaderboards = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const [lvl, inc, pvp, boss, friendsResult] = await Promise.all([
        api.getLevelLeaderboard(),
        api.getIncomeLeaderboard(),
        api.getPvpLeaderboard(),
        api.getBossLeaderboard(),
        api.getFriends(),
      ]);
      setLevelLeaderboard(lvl);
      setIncomeLeaderboard(inc);
      setPvpLeaderboard(pvp);
      setBossLeaderboard(boss);
      setFriendsCount(friendsResult.friends.length);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '랭킹을 불러오지 못했어요.', true);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [showToast]);

  // 알림 확인 콜백(1분·15초 주기)이 항상 최신 설정을 보게 ref로도 들고 있는다.
  const prefsRef = useRef(notificationPrefs);
  useEffect(() => {
    prefsRef.current = notificationPrefs;
  }, [notificationPrefs]);

  useEffect(() => {
    if (!userKey) return;
    api
      .getNotificationPrefs()
      .then(setNotificationPrefs)
      .catch(() => {});
  }, [userKey]);

  const updateNotificationPrefs = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      const before = prefsRef.current;
      setNotificationPrefs({ ...before, ...patch }); // 바로 반영하고, 서버가 거부하면 되돌린다
      try {
        setNotificationPrefs(await api.updateNotificationPrefs(patch));
      } catch (e) {
        setNotificationPrefs(before);
        showToast(e instanceof Error ? e.message : '알림 설정을 바꾸지 못했어요.', true);
      }
    },
    [showToast],
  );

  const lastUnreadRef = useRef<number | null>(null);
  const refreshMailSummary = useCallback(async () => {
    try {
      const summary = await api.getMailSummary();
      setMailSummary(summary);
      // 처음 불러올 때는 알리지 않고, 그 뒤로 안 읽은 우편이 늘어났을 때만 알린다.
      if (prefsRef.current.mail && lastUnreadRef.current !== null && summary.unread > lastUnreadRef.current) {
        showToast('📬 새 우편이 도착했어요! 우편함을 확인해 보세요.');
      }
      lastUnreadRef.current = summary.unread;
    } catch {
      // 우편 확인 실패는 게임 진행에 영향이 없으니 다음 주기에 다시 시도한다.
    }
  }, [showToast]);

  useEffect(() => {
    if (!userKey) return;
    Promise.resolve().then(() => refreshMailSummary());
    const id = setInterval(() => void refreshMailSummary(), 60_000);
    return () => clearInterval(id);
  }, [userKey, refreshMailSummary]);

  const lastFriendUnreadRef = useRef<number | null>(null);
  const refreshFriendChatUnread = useCallback(async () => {
    try {
      const unread = await api.getFriendChatUnread();
      setFriendChatUnread(unread);
      // 처음 불러올 때는 알리지 않고, 그 뒤로 안 읽은 메시지가 늘어났을 때만 알린다.
      if (prefsRef.current.friendChat && lastFriendUnreadRef.current !== null && unread.total > lastFriendUnreadRef.current) {
        showToast('💬 친구에게서 새 메시지가 왔어요!');
      }
      lastFriendUnreadRef.current = unread.total;
    } catch {
      // 다음 주기에 다시 시도한다.
    }
  }, [showToast]);

  useEffect(() => {
    if (!userKey) return;
    Promise.resolve().then(() => refreshFriendChatUnread());
    const id = setInterval(() => void refreshFriendChatUnread(), 15_000);
    return () => clearInterval(id);
  }, [userKey, refreshFriendChatUnread]);

  // 랭킹은 다른 유저 데이터라 게임 본체 로딩/에러와는 분리해서, 실패해도 게임 진행에 영향을 주지 않는다.
  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    if (!userKey) return;
    Promise.resolve().then(() => reloadLeaderboards());
  }, [userKey, reloadLeaderboards]);

  useEffect(() => {
    if (!userKey) return;
    let cancelled = false;

    (async () => {
      try {
        const [gs, sp, up, qu, ach, eq, boss] = await Promise.all([
          api.getGameState(),
          api.getSpecies(),
          api.getUpgrades(),
          api.getQuests(),
          api.getAchievements(),
          api.getEquipmentCatalog(),
          api.getBossCatalog(),
        ]);
        if (cancelled) return;
        setSpecies(sp);
        setUpgrades(up);
        setQuests(qu);
        setAchievements(ach);
        setEquipmentCatalog(eq);
        setBossCatalog(boss);

        const lastSeenKey = `isopod-grove-last-seen-${userKey}`;
        const lastSeenRaw = localStorage.getItem(lastSeenKey);
        const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : Date.now();
        const away = Math.max(0, Math.floor((Date.now() - lastSeen) / 1000));

        let finalState = gs;
        if (away > 5) {
          const result = await api.advance(away);
          finalState = result.gameState;
          if (result.births) {
            showToast(`자리를 비운 사이 새 식구 ${result.births}마리가 태어났어요.`);
          }
        }
        if (cancelled) return;
        setGameState(finalState);
        localStorage.setItem(lastSeenKey, String(Date.now()));
        lastTickRef.current = Date.now();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '불러오는 중 문제가 발생했어요.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userKey, showToast]);

  useEffect(() => {
    if (!userKey || loading) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastTickRef.current) / 1000);
      if (elapsed < 1) return;
      lastTickRef.current = now;
      api
        .advance(elapsed)
        .then((result) => {
          setGameState(result.gameState);
          localStorage.setItem(`isopod-grove-last-seen-${userKey}`, String(now));
          if (result.births) {
            showToast(`작은 발소리! 새 식구 ${result.births}마리가 태어났어요.`);
          }
        })
        .catch(() => {
          // 다음 틱에서 재시도
        });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [userKey, loading, showToast]);

  const runAction = useCallback(
    async <T extends ActionResult>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        const result = await fn();
        setGameState(result.gameState);
        if (result.message) showToast(result.message);
        return result;
      } catch (e) {
        showToast(e instanceof Error ? e.message : '문제가 발생했어요.', true);
        return null;
      }
    },
    [showToast],
  );

  return {
    gameState,
    species,
    upgrades,
    quests,
    achievements,
    equipmentCatalog,
    bossCatalog,
    levelLeaderboard,
    incomeLeaderboard,
    pvpLeaderboard,
    bossLeaderboard,
    friendsCount,
    mailSummary,
    refreshMailSummary,
    friendChatUnread,
    refreshFriendChatUnread,
    notificationPrefs,
    updateNotificationPrefs,
    leaderboardLoading,
    reloadLeaderboards,
    loading,
    error,
    toast,
    showToast,
    runAction,
  };
}
