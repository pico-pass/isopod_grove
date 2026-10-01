import { useEffect, useRef, useState } from 'react';
import type { BattleTurn } from '../api/types';

const TURN_DELAY_MS = 550;

// 지금까지 공개된 턴만 보고 특정 쪽의 "현재" HP를 계산한다.
// 내 HP는 상대가 공격한 턴(attacker: 'enemy')의 결과에서, 상대 HP는 내가 공격한 턴에서 나온다.
export function hpAfter(
  log: BattleTurn[],
  visibleCount: number,
  side: 'me' | 'enemy',
  startHp: number,
): number {
  const damagedBy: 'me' | 'enemy' = side === 'me' ? 'enemy' : 'me';
  for (let i = Math.min(visibleCount, log.length) - 1; i >= 0; i--) {
    if (log[i].attacker === damagedBy) return log[i].remainingHp;
  }
  return startHp;
}

// 전투 결과(log)를 턴 단위로 하나씩 공개해 실시간 연출처럼 보여준다.
// 야생 배틀/PvP 양쪽에서 쓰는 공용 로직이라 훅으로 뺐다.
export function useBattleReplay(log: BattleTurn[] | undefined) {
  const [visibleTurns, setVisibleTurns] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  // 아직 공개 안 된 턴이 남아 있다는 뜻 — 이 값 자체가 "재생 중"인지를 알려준다.
  const animating = !!log && visibleTurns < log.length;

  useEffect(() => {
    if (!animating || !log) return;
    const timer = setTimeout(() => setVisibleTurns((n) => n + 1), TURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [animating, visibleTurns, log]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleTurns]);

  return { visibleTurns, setVisibleTurns, animating, logRef };
}
