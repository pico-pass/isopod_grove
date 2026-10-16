// 랭킹에서 한 번에 볼 수 있는 인원 수 선택지. 서버(leaderboard.service.ts의 LEADERBOARD_LIMITS)와 같은 값이어야 한다.
export const RANKING_LIMITS = [20, 50, 100] as const;
export type RankingLimit = (typeof RANKING_LIMITS)[number];
export const DEFAULT_RANKING_LIMIT: RankingLimit = 20;

const STORAGE_KEY = 'isopod-ranking-limit';

// 마지막으로 고른 인원 수(모든 랭킹 화면이 같이 쓴다). 저장된 값이 없거나 이상하면 기본값이다.
export function loadRankingLimit(): RankingLimit {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    return (RANKING_LIMITS as readonly number[]).includes(n) ? (n as RankingLimit) : DEFAULT_RANKING_LIMIT;
  } catch {
    return DEFAULT_RANKING_LIMIT;
  }
}

export function saveRankingLimit(limit: RankingLimit): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(limit));
  } catch {
    // 저장하지 못해도 이번 접속에서는 고른 대로 볼 수 있다.
  }
}
