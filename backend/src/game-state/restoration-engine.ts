// ---- 숲 복원 프로젝트 ----
// 모든 유저의 탐색·원정·야생 배틀·던전이 한 주(월~일) 동안 하나의 게이지에 점수로 쌓인다.
// 게이지가 마일스톤(목표의 25·50·75·100·150%)을 넘으면 그 주에 접속하는 모두가 보상을 받을 수 있고, 내가 쌓은 점수에 따라 개인 보상이 따로 있다.
// 목표는 주가 시작될 때 한 번 정해서 그 주 내내 바뀌지 않는다(지난 주 참여자 수와 지난 주 점수를 보고 정한다).

export type RestorationKind = 'explore' | 'expedition' | 'battle' | 'dungeon';

// 한 번에 쌓이는 점수
export const RESTORATION_POINTS = {
  explore: 2,
  expedition: 5,
  battleWin: 2,
  battleLose: 1,
  dungeonPerFiveFloors: 1,
  dungeonMax: 10,
} as const;

// 한 사람이 하루에 쌓을 수 있는 점수(많이 하는 사람이 게이지를 혼자 채우지 못하게)
export const RESTORATION_DAILY_CAP = 50;
// 주간 목표: 지난 주 참여자 1명당 이만큼, 단 지난 주 점수의 110%를 넘지 않게(너무 큰 목표를 막는다). 최소 목표가 있다.
export const RESTORATION_GOAL_PER_PLAYER = 100;
export const RESTORATION_GOAL_GROWTH = 1.1;
export const RESTORATION_MIN_GOAL = 300;
export const RESTORATION_BOARD_SIZE = 10;

export interface RestorationReward {
  gold: number;
  diamonds: number;
  tickets: number; // 숲 탐색권
}

// 공동 마일스톤: 게이지가 넘으면 그 주에 접속한 모두가 한 번씩 받는다
export interface RestorationMilestone {
  id: string;
  percent: number;
  reward: RestorationReward;
}
export const RESTORATION_MILESTONES: RestorationMilestone[] = [
  { id: 'm25', percent: 25, reward: { gold: 5_000, diamonds: 0, tickets: 0 } },
  { id: 'm50', percent: 50, reward: { gold: 20_000, diamonds: 1, tickets: 0 } },
  { id: 'm75', percent: 75, reward: { gold: 50_000, diamonds: 2, tickets: 1 } },
  { id: 'm100', percent: 100, reward: { gold: 100_000, diamonds: 3, tickets: 2 } },
  { id: 'm150', percent: 150, reward: { gold: 200_000, diamonds: 5, tickets: 3 } },
];

// 개인 공헌 보상: 내가 그 주에 쌓은 점수가 이만큼 넘으면 받는다
export interface RestorationPersonal {
  id: string;
  points: number;
  reward: RestorationReward;
}
export const RESTORATION_PERSONAL: RestorationPersonal[] = [
  { id: 'p30', points: 30, reward: { gold: 5_000, diamonds: 0, tickets: 0 } },
  { id: 'p100', points: 100, reward: { gold: 20_000, diamonds: 1, tickets: 1 } },
  { id: 'p250', points: 250, reward: { gold: 60_000, diamonds: 3, tickets: 2 } },
];

export const RESTORATION_STAGES = [
  { id: 'barren', from: 0, icon: '🥀', name: '황폐한 숲', desc: '메마른 땅에 아직 풀 한 포기 보이지 않아요.' },
  { id: 'sprout', from: 0.25, icon: '🌱', name: '새싹이 돋는 숲', desc: '여기저기서 새싹이 고개를 내밀어요.' },
  { id: 'grass', from: 0.5, icon: '🌿', name: '풀이 우거진 숲', desc: '풀이 우거지고 벌레 소리가 들려와요.' },
  { id: 'tree', from: 0.75, icon: '🌳', name: '울창한 숲', desc: '나무가 자라 그늘이 드리워졌어요.' },
  { id: 'bloom', from: 1, icon: '🌸', name: '활짝 핀 숲', desc: '숲이 완전히 되살아났어요!' },
] as const;

// 이번 주 목표 점수. prev는 지난 주 기록(없으면 null).
export function restorationGoal(prev: { points: number; contributors: number } | null): number {
  if (!prev || prev.contributors <= 0) return RESTORATION_MIN_GOAL;
  const byPlayers = prev.contributors * RESTORATION_GOAL_PER_PLAYER;
  const byGrowth = prev.points * RESTORATION_GOAL_GROWTH;
  return Math.max(RESTORATION_MIN_GOAL, Math.round(Math.min(byPlayers, byGrowth) / 10) * 10);
}

export function restorationStage(ratio: number) {
  let stage: (typeof RESTORATION_STAGES)[number] = RESTORATION_STAGES[0];
  for (const s of RESTORATION_STAGES) if (ratio >= s.from) stage = s;
  return stage;
}

// 마일스톤에 닿는 데 필요한 점수
export function milestoneAt(goal: number, m: RestorationMilestone): number {
  return Math.ceil((goal * m.percent) / 100);
}

// 던전 한 판이 쌓는 점수: 5층마다 1점, 최대 10점
export function dungeonRestorationPoints(floors: number): number {
  return Math.max(0, Math.min(RESTORATION_POINTS.dungeonMax, Math.floor(floors / 5) * RESTORATION_POINTS.dungeonPerFiveFloors));
}

export function findRestorationReward(id: string): { kind: 'milestone' | 'personal'; reward: RestorationReward; label: string } | null {
  const m = RESTORATION_MILESTONES.find((x) => x.id === id);
  if (m) return { kind: 'milestone', reward: m.reward, label: `복원 게이지 ${m.percent}%` };
  const p = RESTORATION_PERSONAL.find((x) => x.id === id);
  if (p) return { kind: 'personal', reward: p.reward, label: `내 공헌 ${p.points}점` };
  return null;
}

export function rewardText(r: RestorationReward): string {
  return [r.gold ? `${r.gold.toLocaleString('ko-KR')} G` : '', r.diamonds ? `💎 ${r.diamonds}개` : '', r.tickets ? `🎟️ 탐색권 ${r.tickets}장` : ''].filter(Boolean).join(' · ');
}
