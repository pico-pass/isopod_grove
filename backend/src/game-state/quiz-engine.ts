// ---- 이 콩 누구? ----
// 실루엣이나 확대한 그림만 보고 어느 콩벌레인지 맞히는 연속 정답 퀴즈다. 제한 시간은 처음 8초이고, 맞힐 때마다 0.1초씩 줄어든다(최소 2초).
// 틀리거나 시간이 지나면 끝이고 점수는 연속으로 맞힌 개수다. 정답은 서버만 알고, 화면은 보기 목록과 그림 주소(알아볼 수 없는 일회용 주소)만 받는다.
import type { SpeciesFamily } from '../species/species.family';

export const QUIZ_START_MS = 8000;
export const QUIZ_STEP_MS = 100;
export const QUIZ_MIN_MS = 2000;
export const QUIZ_GRACE_MS = 1200; // 네트워크 지연을 봐줘서 제한 시간에 이만큼 더한 뒤에 시간 초과로 본다
export const QUIZ_MIN_ANSWER_MS = 300; // 이보다 빨리 온 답은 사람이 읽고 고른 것이 아니라서 받지 않는다
export const QUIZ_IMAGE_TTL_MS = 2 * 60_000; // 그림 주소가 살아 있는 시간

export const quizLimitMs = (streak: number): number => Math.max(QUIZ_MIN_MS, QUIZ_START_MS - QUIZ_STEP_MS * Math.max(0, Math.floor(streak)));

// 보기 개수: 연속 정답이 쌓일수록 늘어난다
export const quizChoiceCount = (streak: number): number => (streak >= 30 ? 6 : streak >= 15 ? 5 : 4);

// 그림 보여 주는 방식: 처음엔 실루엣, 10개부터는 확대한 그림, 25개부터는 확대한 실루엣
export type QuizMode = 'silhouette' | 'zoom' | 'zoomShadow';
export const quizMode = (streak: number): QuizMode => (streak >= 25 ? 'zoomShadow' : streak >= 10 ? 'zoom' : 'silhouette');

export interface QuizZoom {
  scale: number; // 확대 배율(2~3.4)
  x: number; // 확대 중심(%, 20~80)
  y: number;
}
export function rollQuizZoom(random: () => number = Math.random): QuizZoom {
  const r = (min: number, max: number) => Math.round((min + random() * (max - min)) * 10) / 10;
  return { scale: r(2, 3.4), x: r(20, 80), y: r(20, 80) };
}

export interface QuizSpeciesLike {
  speciesId: string;
  rarity: number;
  family: SpeciesFamily;
}

// 보기를 고른다: 정답 1개 + 틀린 보기. 연속 정답이 쌓일수록 정답과 닮은(같은 계열, 같은 희귀도) 종이 틀린 보기로 많이 섞인다.
// 보기의 순서는 무작위다. 풀이 모자라면 있는 만큼만 돌려준다.
export function pickQuizChoices(pool: readonly QuizSpeciesLike[], correct: QuizSpeciesLike, streak: number, random: () => number = Math.random): string[] {
  const want = quizChoiceCount(streak) - 1;
  const others = pool.filter((s) => s.speciesId !== correct.speciesId);
  const weight = (s: QuizSpeciesLike) => {
    const sameFamily = s.family === correct.family;
    const sameRarity = s.rarity === correct.rarity;
    const level = streak >= 15 ? 2 : streak >= 5 ? 1 : 0;
    return 1 + level * (sameFamily ? 3 : 0) + level * (sameRarity ? 3 : 0);
  };
  const picked: string[] = [];
  const bag = [...others];
  while (picked.length < want && bag.length > 0) {
    const total = bag.reduce((sum, s) => sum + weight(s), 0);
    let r = random() * total;
    let idx = 0;
    for (; idx < bag.length - 1; idx++) {
      r -= weight(bag[idx]);
      if (r < 0) break;
    }
    picked.push(bag[idx].speciesId);
    bag.splice(idx, 1);
  }
  const all = [correct.speciesId, ...picked];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// 정답을 고른다: 이번 판에서 아직 안 나온 종 중에서(다 나왔으면 처음부터 다시)
export function pickQuizAnswer<T extends { speciesId: string }>(pool: readonly T[], seen: readonly string[], random: () => number = Math.random): T | null {
  if (pool.length === 0) return null;
  const fresh = pool.filter((s) => !seen.includes(s.speciesId));
  const from = fresh.length > 0 ? fresh : pool;
  return from[Math.min(from.length - 1, Math.floor(random() * from.length))];
}

// ---- 보상 ----
export interface QuizReward {
  explorationTickets: number;
  diamonds: number;
}
// 내 최고 연속 정답이 이 개수에 닿을 때 한 번씩(평생). 합계 🎟️1 · 💎6.
export const QUIZ_MILESTONES: readonly { streak: number; reward: QuizReward }[] = [
  { streak: 10, reward: { explorationTickets: 1, diamonds: 0 } },
  { streak: 20, reward: { explorationTickets: 0, diamonds: 1 } },
  { streak: 30, reward: { explorationTickets: 0, diamonds: 2 } },
  { streak: 50, reward: { explorationTickets: 0, diamonds: 3 } },
];

// 큰 값이 위인 순서로 정렬된 기록들의 순위(같은 값은 같은 순위, 다음 순위는 건너뛴다: 1, 1, 3)
export function rankByStreak(streaksDescending: readonly number[]): number[] {
  const ranks: number[] = [];
  streaksDescending.forEach((s, i) => ranks.push(i > 0 && s === streaksDescending[i - 1] ? ranks[i - 1] : i + 1));
  return ranks;
}
