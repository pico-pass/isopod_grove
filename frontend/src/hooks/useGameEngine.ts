import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { ActionResult, GameState, Quest, Species, Upgrade } from '../api/types';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToastState] = useState<ToastState | null>(null);

  const lastTickRef = useRef<number>(0);
  const toastKeyRef = useRef(0);

  const showToast = useCallback((message: string, isError = false) => {
    toastKeyRef.current += 1;
    setToastState({ message, error: isError, key: toastKeyRef.current });
  }, []);

  useEffect(() => {
    if (!userKey) return;
    let cancelled = false;

    (async () => {
      try {
        const [gs, sp, up, qu] = await Promise.all([
          api.getGameState(),
          api.getSpecies(),
          api.getUpgrades(),
          api.getQuests(),
        ]);
        if (cancelled) return;
        setSpecies(sp);
        setUpgrades(up);
        setQuests(qu);

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
    async (fn: () => Promise<ActionResult>): Promise<ActionResult | null> => {
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
    loading,
    error,
    toast,
    runAction,
  };
}
