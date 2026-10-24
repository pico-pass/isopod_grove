// 리듬 일격: 강력한 일격을 타이밍 바로 쏜다. 마커가 가운데에 가까울 때 멈출수록 정확도(0~1)가 높고, 서버가 그 정확도로
// 일격 피해를 최대 ±30% 보정한다(서버 game-engine.ts의 rhythmStrikeBonus와 같은 식). 서버는 0~1 범위 안에서만 인정한다.
export const RHYTHM_MAX_BONUS = 0.3;
export const RHYTHM_HALF_PERIOD_MS = 650; // 마커가 바 한쪽 끝에서 반대쪽 끝까지 가는 시간

// 시작한 뒤 흐른 시간에서 마커 위치(0=왼쪽 끝, 1=오른쪽 끝). 끝에 닿으면 되돌아오는 삼각파다.
export function markerPosition(elapsedMs: number, halfPeriodMs = RHYTHM_HALF_PERIOD_MS): number {
  const t = ((elapsedMs % (halfPeriodMs * 2)) + halfPeriodMs * 2) % (halfPeriodMs * 2);
  return t <= halfPeriodMs ? t / halfPeriodMs : 2 - t / halfPeriodMs;
}

// 마커 위치 → 정확도(가운데 1, 양 끝 0). 서버에는 소수 둘째 자리까지만 보낸다.
export function rhythmAccuracy(position: number): number {
  const clamped = Math.max(0, Math.min(1, position));
  return Math.round((1 - Math.abs(clamped - 0.5) * 2) * 100) / 100;
}

// 정확도 → 일격 피해 보정(%): 0.5가 0, 1이 +30, 0이 −30
export function rhythmBonusPercent(accuracy: number): number {
  const clamped = Math.max(0, Math.min(1, accuracy));
  return Math.round((clamped - 0.5) * 2 * RHYTHM_MAX_BONUS * 100);
}

export function rhythmGrade(accuracy: number): string {
  const pct = rhythmBonusPercent(accuracy);
  return pct >= 24 ? '완벽!' : pct > 0 ? '좋아요' : pct === 0 ? '무난해요' : '아쉬워요';
}

const STORAGE_KEY = 'isopod-rhythm-strike';

// 리듬 일격을 켜 둘지(기본 켬). 끄면 예전처럼 일격이 바로 나간다.
export function loadRhythmEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveRhythmEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // 저장하지 못해도 이번 접속에서는 고른 대로 된다.
  }
}
