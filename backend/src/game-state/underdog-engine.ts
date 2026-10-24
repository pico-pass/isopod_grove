// ---- 하극상 대회 ----
// 희귀도 '일반' 콩벌레만 나갈 수 있는 주간(월~일) 승점 대회. 장비는 쓰지 않고 전투 레벨과 개체 편차(±15%)로 겨룬다.
// 상대는 같은 주에 출전한 다른 유저의 식구(그 순간의 레벨)이고, 아무도 없으면 레벨이 비슷한 야생 선수와 겨룬다(승점이 절반).
export const UNDERDOG_RARITY = 0; // 출전 가능한 희귀도
export const UNDERDOG_DAILY_MATCHES = 10;
export const UNDERDOG_WIN_POINTS = 20;
export const UNDERDOG_WIN_LEVEL_BONUS_MAX = 10; // 나보다 레벨이 높은 상대를 이기면 레벨 차이만큼(최대 이만큼) 더
export const UNDERDOG_LOSS_POINTS = 8; // 지면 잃는 승점(0 아래로는 안 내려간다)
export const UNDERDOG_NPC_RATE = 0.5; // 야생 선수와의 경기는 승점이 이 비율
export const UNDERDOG_WIN_GOLD = 1000; // 이길 때마다 받는 골드
export const UNDERDOG_BOARD_SIZE = 20;
export const UNDERDOG_MIN_MATCHES_FOR_REWARD = 5; // 지난 주 보상을 받으려면 최소 이만큼 경기를 치러야 한다

// 야생 선수의 레벨: 내 레벨의 80~100%(최소 1)
export const UNDERDOG_NPC_LEVEL_MIN = 0.8;

// 그 주의 키: 월요일 날짜('년-월-일'). dayKey와 같은 시계(서버 한국 시간)를 쓴다.
export function weekKeyOf(now = Date.now()): string {
  const d = new Date(now);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
}

export function previousWeekKeyOf(now = Date.now()): string {
  const d = new Date(now);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7) - 7);
  return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
}

// 이번 주가 끝나기까지 남은 시간(ms): 다음 월요일 0시까지
export function msUntilWeekEnd(now = Date.now()): number {
  const d = new Date(now);
  const nextMonday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7) + 7);
  return nextMonday.getTime() - now;
}

// 승점 변화(이기면 +, 지면 −). 점수가 0 아래로 내려가는 것은 호출한 쪽에서 막는다.
export function underdogPointsDelta(won: boolean, myLevel: number, opponentLevel: number, vsNpc: boolean): number {
  const rate = vsNpc ? UNDERDOG_NPC_RATE : 1;
  if (won) {
    const bonus = Math.max(0, Math.min(UNDERDOG_WIN_LEVEL_BONUS_MAX, opponentLevel - myLevel));
    return Math.round((UNDERDOG_WIN_POINTS + bonus) * rate);
  }
  return -Math.round(UNDERDOG_LOSS_POINTS * rate);
}

// 지난 주 순위 보상(순위는 1부터, 같은 승점은 같은 순위). 경기를 거의 안 했으면 없다.
export interface UnderdogReward {
  gold: number;
  diamonds: number;
  label: string;
}
export function underdogReward(rank: number, matches: number): UnderdogReward | null {
  if (matches < UNDERDOG_MIN_MATCHES_FOR_REWARD || rank < 1) return null;
  if (rank === 1) return { gold: 300_000, diamonds: 10, label: '🥇 우승' };
  if (rank === 2) return { gold: 200_000, diamonds: 6, label: '🥈 준우승' };
  if (rank === 3) return { gold: 150_000, diamonds: 4, label: '🥉 3위' };
  if (rank <= 10) return { gold: 80_000, diamonds: 2, label: '🏅 10위 이내' };
  return { gold: 20_000, diamonds: 0, label: '🎗️ 참가상' };
}

// 승점 내림차순 → 승수 내림차순 → 유저 id 순으로 늘어놓고, 같은 승점·승수는 같은 순위(1, 1, 3)를 준다.
export function rankUnderdog<T extends { points: number; wins: number; userId: string }>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => b.points - a.points || b.wins - a.wins || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
  const out: (T & { rank: number })[] = [];
  sorted.forEach((row, i) => {
    const prev = out[i - 1];
    out.push({ ...row, rank: prev && prev.points === row.points && prev.wins === row.wins ? prev.rank : i + 1 });
  });
  return out;
}
