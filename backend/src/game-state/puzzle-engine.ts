// ---- 오늘의 퍼즐 "굴러라 콩벌레" ----
// 콩벌레가 몸을 말고 굴러서 나뭇잎에 닿는 슬라이드 퍼즐이다. 한 번 굴리면 바위나 벽에 부딪힐 때까지 미끄러지고,
// 나뭇잎에 닿으면 거기서 멈춘다(도착). 하루에 10단계가 있고, 단계마다 판이 새로 나온다. 갈수록 어려워지고(최단 수가 길어진다),
// 모두에게 같은 날 같은 순서의 판이 나온다(날짜+단계가 시드). 앞 단계를 깨야 다음 단계가 열리고, 많이 깰수록·적은 수로 깰수록 높은 순위다.
// 판은 날짜와 단계로만 정해지는 순수 계산이라 서버가 언제 다시 만들어도 같고, 이동 기록(문자열)만 받아 서버가 그대로 다시 굴려서 검증한다.
// 프론트(utils/puzzle.ts)에 같은 굴리기 규칙이 있다(화면 애니메이션용). 규칙을 바꿀 땐 두 곳을 함께 고쳐야 한다.

export const PUZZLE_SIZE = 10; // 10×10 칸
export const PUZZLE_STAGES = 10; // 하루 단계 수
export const PUZZLE_MAX_MOVES = 80; // 한 번에 제출할 수 있는 이동 수 상한(검증 비용 제한)
export const PUZZLE_MOVES = ['U', 'D', 'L', 'R'] as const;
export type PuzzleMove = (typeof PUZZLE_MOVES)[number];

export interface PuzzleCell {
  x: number;
  y: number;
}

export interface PuzzleBoard {
  width: number;
  height: number;
  rocks: PuzzleCell[]; // 지나갈 수 없는 바위
  start: PuzzleCell;
  goal: PuzzleCell; // 나뭇잎
}

export interface DailyPuzzle extends PuzzleBoard {
  dayKey: string;
  stage: number; // 1~PUZZLE_STAGES
  par: number; // 이 판의 최단 이동 수
}

// 단계별 목표 최단 수(판을 만들 때 이 값 ~ +1에 맞는 판을 고른다). 1단계도 예전 퍼즐의 가장 어려운 날보다 어렵고, 10단계는 한참 더 길다.
export const PUZZLE_STAGE_TARGET_PAR: readonly number[] = [11, 12, 13, 14, 16, 17, 18, 20, 21, 23];

// ---- 별점 ----
// 최단 수로 깨면 ★3, 최단 수+2 이내면 ★2, 그 밖에 깨면 ★1.
export const PUZZLE_STAR2_MARGIN = 2;
export function getPuzzleStars(par: number, moves: number): 1 | 2 | 3 {
  if (moves <= par) return 3;
  if (moves <= par + PUZZLE_STAR2_MARGIN) return 2;
  return 1;
}

// ---- 날짜 ----
// 퍼즐의 하루는 한국 시간 자정에 바뀐다(다른 일일 초기화는 서버 시계(UTC)라 한국 시간 오전 9시에 바뀌지만, 퍼즐은 달력 날짜와 맞춘다).
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getPuzzleDayKey(now: number = Date.now()): string {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10); // YYYY-MM-DD
}

export function isPuzzleDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === value;
}

// 어제의 날짜 키
export function getPreviousPuzzleDayKey(dayKey: string): string {
  return new Date(Date.parse(`${dayKey}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

// 이 날의 퍼즐이 끝나는(= 다음 퍼즐이 나오는) 시각(ms). 한국 시간 자정이다.
export function getPuzzleResetAt(dayKey: string): number {
  return Date.parse(`${dayKey}T00:00:00Z`) + DAY_MS - KST_OFFSET_MS;
}

// ---- 난수 ----
function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 굴리기 ----
const DIRECTIONS: Record<PuzzleMove, [number, number]> = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

// 칸 번호(y × 폭 + x)로 다루는 내부 판. 바위 조회가 빨라야 풀이(BFS)가 가볍다.
interface IndexedBoard {
  width: number;
  height: number;
  rocks: Set<number>;
  start: number;
  goal: number;
}

function indexBoard(board: PuzzleBoard): IndexedBoard {
  const at = (c: PuzzleCell) => c.y * board.width + c.x;
  return {
    width: board.width,
    height: board.height,
    rocks: new Set(board.rocks.map(at)),
    start: at(board.start),
    goal: at(board.goal),
  };
}

// pos에서 dir 방향으로 굴린 뒤 멈추는 칸. 바위·벽 앞에서 멈추고, 나뭇잎 칸에 닿으면 거기서 멈춘다.
function slideIndex(board: IndexedBoard, pos: number, dir: PuzzleMove): number {
  const [dx, dy] = DIRECTIONS[dir];
  let x = pos % board.width;
  let y = Math.floor(pos / board.width);
  for (;;) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) break;
    if (board.rocks.has(ny * board.width + nx)) break;
    x = nx;
    y = ny;
    if (y * board.width + x === board.goal) break;
  }
  return y * board.width + x;
}

export function slidePuzzle(board: PuzzleBoard, from: PuzzleCell, dir: PuzzleMove): PuzzleCell {
  const indexed = indexBoard(board);
  const pos = slideIndex(indexed, from.y * board.width + from.x, dir);
  return { x: pos % board.width, y: Math.floor(pos / board.width) };
}

// 시작 칸에서 도착 칸까지의 최단 이동 수와, 그걸 찾을 때까지 훑은 정지 칸 수(갈래가 많은 판일수록 크다). 도착할 수 없으면 null.
function solveIndexed(board: IndexedBoard): { par: number; explored: number } | null {
  const dist = new Map<number, number>([[board.start, 0]]);
  let frontier = [board.start];
  let par: number | null = null;
  while (frontier.length > 0 && par === null) {
    const next: number[] = [];
    for (const pos of frontier) {
      for (const dir of PUZZLE_MOVES) {
        const to = slideIndex(board, pos, dir);
        if (dist.has(to)) continue;
        dist.set(to, (dist.get(pos) as number) + 1);
        if (to === board.goal) par = dist.get(to) as number;
        next.push(to);
      }
    }
    frontier = next;
  }
  return par === null ? null : { par, explored: dist.size };
}

export function solvePuzzle(board: PuzzleBoard): number | null {
  return solveIndexed(indexBoard(board))?.par ?? null;
}

// ---- 판 만들기 ----
const MIN_EXPLORED = 30; // 풀이(BFS)가 도착 칸을 찾을 때까지 훑은 정지 칸이 이보다 적은 판(거의 외길)은 제외한다
const CLIMB_ITERATIONS = 4000; // 한 번 시도에서 판을 고쳐 보는 횟수
const MAX_RESTARTS = 20; // 목표에 못 닿으면 새 판에서 다시 시작하는 최대 횟수

function toCell(index: number, width: number): PuzzleCell {
  return { x: index % width, y: Math.floor(index / width) };
}

export function getPuzzleStageTargetPar(stage: number): number {
  return PUZZLE_STAGE_TARGET_PAR[Math.max(1, Math.min(PUZZLE_STAGES, stage)) - 1];
}

// 목표 최단 수(target ~ target+1)에 맞는 판을 "언덕 오르기"로 만든다: 무작위 판에서 시작해 바위·시작·도착 칸을 하나씩 옮겨 보며
// 최단 수가 목표에 가까워지는(같아도 허용) 변화만 받아들인다. 무작위로 뽑기만 하면 최단 수가 긴 판이 거의 안 나오기 때문이다.
// 난수는 시드에서만 나오니 같은 (날짜, 단계)는 언제 만들어도 같은 판이다.
export function generatePuzzleStage(dayKey: string, stage: number): DailyPuzzle {
  const random = mulberry32(hashSeed(`isopod-puzzle:v2:${dayKey}:${stage}`));
  const size = PUZZLE_SIZE;
  const cells = size * size;
  const target = getPuzzleStageTargetPar(stage);
  const baseRocks = 16 + Math.floor(target / 2);
  const score = (s: { par: number; explored: number } | null) =>
    s ? -Math.abs(s.par - (target + 0.5)) + 0.03 * Math.min(s.explored, 70) : -Infinity;
  const randomCell = (taken: (c: number) => boolean) => {
    let c: number;
    do c = Math.floor(random() * cells);
    while (taken(c));
    return c;
  };
  let best: { board: IndexedBoard; par: number; gap: number } | null = null;

  for (let restart = 0; restart < MAX_RESTARTS; restart++) {
    const rocks = new Set<number>();
    while (rocks.size < baseRocks) rocks.add(Math.floor(random() * cells));
    const start0 = randomCell((c) => rocks.has(c));
    let board: IndexedBoard = { width: size, height: size, rocks, start: start0, goal: randomCell((c) => rocks.has(c) || c === start0) };
    let current = solveIndexed(board);

    for (let it = 0; it < CLIMB_ITERATIONS; it++) {
      if (current && current.par >= target && current.par <= target + 1 && current.explored >= MIN_EXPLORED) break;
      const kind = random();
      let { rocks: nextRocks, start, goal } = board;
      if (kind < 0.6) {
        // 바위 하나를 다른 빈칸으로 옮긴다
        nextRocks = new Set(board.rocks);
        const list = [...nextRocks];
        nextRocks.delete(list[Math.floor(random() * list.length)]);
        nextRocks.add(randomCell((c) => nextRocks.has(c) || c === start || c === goal));
      } else if (kind < 0.8) {
        goal = randomCell((c) => board.rocks.has(c) || c === start);
      } else if (kind < 0.9) {
        start = randomCell((c) => board.rocks.has(c) || c === goal);
      } else {
        // 바위를 하나 더하거나 줄인다(개수는 기준 근처로 유지)
        nextRocks = new Set(board.rocks);
        if (nextRocks.size > baseRocks + 6 || (nextRocks.size > baseRocks - 4 && random() < 0.5)) {
          const list = [...nextRocks];
          nextRocks.delete(list[Math.floor(random() * list.length)]);
        } else {
          nextRocks.add(randomCell((c) => nextRocks.has(c) || c === start || c === goal));
        }
      }
      const candidate: IndexedBoard = { width: size, height: size, rocks: nextRocks, start, goal };
      const solved = solveIndexed(candidate);
      if (solved && solved.explored < MIN_EXPLORED - 10) continue;
      if (score(solved) >= score(current)) {
        board = candidate;
        current = solved;
      }
    }

    if (current && current.explored >= MIN_EXPLORED) {
      const gap = current.par < target ? target - current.par : current.par > target + 1 ? current.par - target - 1 : 0;
      if (!best || gap < best.gap) best = { board, par: current.par, gap };
      if (gap === 0) break;
    }
  }
  if (!best) throw new Error(`퍼즐을 만들지 못했어요: ${dayKey} ${stage}단계`); // 사실상 일어나지 않는다

  const { board } = best;
  return {
    dayKey,
    stage,
    width: board.width,
    height: board.height,
    rocks: [...board.rocks].sort((a, b) => a - b).map((i) => toCell(i, board.width)),
    start: toCell(board.start, board.width),
    goal: toCell(board.goal, board.width),
    par: best.par,
  };
}

// 같은 (날짜, 단계)의 퍼즐은 매번 다시 만들 필요가 없어서 최근 것만 기억해 둔다.
const puzzleCache = new Map<string, DailyPuzzle>();
export function getPuzzleStage(dayKey: string, stage: number): DailyPuzzle {
  const key = `${dayKey}#${stage}`;
  let puzzle = puzzleCache.get(key);
  if (!puzzle) {
    puzzle = generatePuzzleStage(dayKey, stage);
    puzzleCache.set(key, puzzle);
    if (puzzleCache.size > PUZZLE_STAGES * 3) puzzleCache.delete(puzzleCache.keys().next().value as string);
  }
  return puzzle;
}

// ---- 이동 기록 검증 ----
export type PuzzleReplayResult =
  | { ok: true; moves: number; path: PuzzleCell[] } // path[0]은 시작 칸, 그 뒤는 매 이동 후 위치
  | { ok: false; reason: 'format' | 'too-long' | 'not-solved' | 'trailing' };

// 이동 기록("UDLR" 문자열)을 시작 칸부터 그대로 굴려 보고, 나뭇잎에 도착하는지 확인한다.
// 도착한 뒤에도 이동이 남아 있으면 거절한다(불필요한 이동이 섞이지 않게).
export function replayPuzzleMoves(board: PuzzleBoard, moves: string): PuzzleReplayResult {
  if (typeof moves !== 'string' || !/^[UDLR]+$/.test(moves)) return { ok: false, reason: 'format' };
  if (moves.length > PUZZLE_MAX_MOVES) return { ok: false, reason: 'too-long' };
  const indexed = indexBoard(board);
  let pos = indexed.start;
  const path: PuzzleCell[] = [toCell(pos, indexed.width)];
  for (let i = 0; i < moves.length; i++) {
    pos = slideIndex(indexed, pos, moves[i] as PuzzleMove);
    path.push(toCell(pos, indexed.width));
    if (pos === indexed.goal) {
      return i === moves.length - 1 ? { ok: true, moves: moves.length, path } : { ok: false, reason: 'trailing' };
    }
  }
  return { ok: false, reason: 'not-solved' };
}

// ---- 보상 ----
export interface PuzzleReward {
  explorationTickets: number;
  equipmentShards: number;
  diamonds: number;
}

export const NO_PUZZLE_REWARD: PuzzleReward = { explorationTickets: 0, equipmentShards: 0, diamonds: 0 };

// 단계를 깰 때 받는 장비 조각(인덱스 = 그 단계에서 딴 별 수). 단계마다 따로, 더 높은 별을 따면 차액만 더 받는다.
export const PUZZLE_STAGE_STAR_SHARDS: readonly number[] = [0, 2, 3, 4];

export function getPuzzleStageRewardGain(rewardedStars: number, stars: number): PuzzleReward {
  const from = PUZZLE_STAGE_STAR_SHARDS[Math.max(0, Math.min(3, rewardedStars))];
  const to = PUZZLE_STAGE_STAR_SHARDS[Math.max(0, Math.min(3, stars))];
  return { ...NO_PUZZLE_REWARD, equipmentShards: Math.max(0, to - from) };
}

// 오늘 N단계까지 깼을 때 한 번씩 받는 보너스(하루 한 번씩)
export const PUZZLE_MILESTONES: readonly { stages: number; reward: PuzzleReward }[] = [
  { stages: 3, reward: { explorationTickets: 1, equipmentShards: 0, diamonds: 0 } },
  { stages: 5, reward: { explorationTickets: 0, equipmentShards: 10, diamonds: 1 } },
  { stages: 8, reward: { explorationTickets: 1, equipmentShards: 0, diamonds: 1 } },
  { stages: 10, reward: { explorationTickets: 1, equipmentShards: 20, diamonds: 2 } },
];

export function addPuzzleRewards(a: PuzzleReward, b: PuzzleReward): PuzzleReward {
  return {
    explorationTickets: a.explorationTickets + b.explorationTickets,
    equipmentShards: a.equipmentShards + b.equipmentShards,
    diamonds: a.diamonds + b.diamonds,
  };
}

// ---- 순위 ----
// 순위는 오늘 많이 깬 순(cleared)이고, 같으면 깬 단계들의 "최단 수 초과분 합"(excess)이 적은 순이다. 둘 다 같으면 같은 순위(1, 1, 3).
export interface PuzzleLadderScore {
  cleared: number;
  excess: number;
}

export function comparePuzzleScore(a: PuzzleLadderScore, b: PuzzleLadderScore): number {
  return b.cleared - a.cleared || a.excess - b.excess;
}

export function rankByLadder(sortedBest: PuzzleLadderScore[]): number[] {
  const ranks: number[] = [];
  sortedBest.forEach((s, i) => ranks.push(i > 0 && comparePuzzleScore(s, sortedBest[i - 1]) === 0 ? ranks[i - 1] : i + 1));
  return ranks;
}

// 어제 순위에 따라 받는 다이아. 1위 5개 · 2위 3개 · 3위 2개 · 4~10위 1개.
export const PUZZLE_RANK_REWARDS: readonly { maxRank: number; diamonds: number }[] = [
  { maxRank: 1, diamonds: 5 },
  { maxRank: 2, diamonds: 3 },
  { maxRank: 3, diamonds: 2 },
  { maxRank: 10, diamonds: 1 },
];

export function getPuzzleRankReward(rank: number): number {
  return PUZZLE_RANK_REWARDS.find((r) => rank <= r.maxRank)?.diamonds ?? 0;
}

// 기록(단계별 최소 이동 수)으로 계산하는 오늘의 성적. 앞에서부터 이어서 깬 단계만 센다(stageBest[i] = i+1단계의 최소 이동 수, 0이면 못 깸).
export function computePuzzleScore(dayKey: string, stageBest: readonly number[]): PuzzleLadderScore {
  let cleared = 0;
  let excess = 0;
  for (let i = 0; i < PUZZLE_STAGES; i++) {
    const best = stageBest[i] ?? 0;
    if (!(best > 0)) break;
    cleared++;
    excess += Math.max(0, best - getPuzzleStage(dayKey, i + 1).par);
  }
  return { cleared, excess };
}
