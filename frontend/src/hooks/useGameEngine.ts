import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type {
  Achievement,
  ActionResult,
  GameState,
  LeaderboardResult,
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
  const [levelLeaderboard, setLevelLeaderboard] = useState<LeaderboardResult | null>(null);
  const [incomeLeaderboard, setIncomeLeaderboard] = useState<LeaderboardResult | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
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
      const [lvl, inc] = await Promise.all([api.getLevelLeaderboard(), api.getIncomeLeaderboard()]);
      setLevelLeaderboard(lvl);
      setIncomeLeaderboard(inc);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '랭킹을 불러오지 못했어요.', true);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [showToast]);

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
        const [gs, sp, up, qu, ach] = await Promise.all([
          api.getGameState(),
          api.getSpecies(),
          api.getUpgrades(),
          api.getQuests(),
          api.getAchievements(),
        ]);
        if (cancelled) return;
        setSpecies(sp);
        setUpgrades(up);
        setQuests(qu);
        setAchievements(ach);

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
    levelLeaderboard,
    incomeLeaderboard,
    leaderboardLoading,
    reloadLeaderboards,
    loading,
    error,
    toast,
    runAction,
  };
}
