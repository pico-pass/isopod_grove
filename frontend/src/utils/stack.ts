// 콩 쌓기 시뮬레이션(화면용). 백엔드(game-state/stack-engine.ts)에 같은 코드가 있고, 서버가 "통나무마다 떨어뜨린 틱 수" 목록으로
// 이 시뮬레이션을 처음부터 다시 돌려서 높이를 정한다. 그래서 이 파일은 서버 코드와 한 칸도 어긋나면 안 된다.
// 규칙·상수를 바꿀 땐 두 곳을 함께 고쳐야 하고, 계산은 정수로만 한다. 화면에 그리는 건 StackView.tsx가 맡는다.

export const STACK_TPS = 60;
export const STACK_TICK_MS = 1000 / STACK_TPS;
export const STACK_RANGE = 1000;
export const STACK_START_W = 360;
export const STACK_MAX_HEIGHT = 150;
export const STACK_MAX_DELAY = 1800;
export const STACK_MIN_DELAY = 2;
export const STACK_SPEED_START = 5;
export const STACK_SPEED_MAX = 17;
export const STACK_SPEED_EVERY = 3;
export const STACK_PERFECT_TOLERANCE_BY_RARITY: readonly number[] = [6, 7, 8, 9, 10];
export const STACK_GROW_STREAK = 3;
export const STACK_GROW = 10;

// 서버(dungeon-engine.ts)의 seededRandom과 같은 난수. 시드·소금이 같으면 같은 값이 나온다.
export function seededRandom(seed: number, ...salts: number[]): () => number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (const s of salts) {
    h = Math.imul(h ^ (s + 0x7f4a7c15), 0x85ebca6b) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getStackTolerance(rarity: number): number {
  const i = Number.isInteger(rarity) ? Math.max(0, Math.min(STACK_PERFECT_TOLERANCE_BY_RARITY.length - 1, rarity)) : 0;
  return STACK_PERFECT_TOLERANCE_BY_RARITY[i];
}

export const stackSpeed = (index: number): number => Math.min(STACK_SPEED_MAX, STACK_SPEED_START + Math.floor((index - 1) / STACK_SPEED_EVERY));

export interface StackGame {
  seed: number;
  tolerance: number;
  height: number;
  prevX: number;
  prevW: number;
  streak: number;
  perfects: number;
  ticks: number;
  over: boolean;
  completed: boolean;
}

export function newStackGame(seed: number, rarity: number): StackGame {
  return { seed: seed >>> 0, tolerance: getStackTolerance(rarity), height: 0, prevX: Math.floor((STACK_RANGE - STACK_START_W) / 2), prevW: STACK_START_W, streak: 0, perfects: 0, ticks: 0, over: false, completed: false };
}

export interface StackBlockSpec {
  index: number;
  w: number;
  speed: number;
  range: number;
  phase: number;
}
export function stackBlockSpec(game: StackGame): StackBlockSpec {
  const index = game.height + 1;
  const w = game.prevW;
  const range = Math.max(1, STACK_RANGE - w);
  const phase = Math.floor(seededRandom(game.seed, index, 51)() * range * 2);
  return { index, w, speed: stackSpeed(index), range, phase };
}

export function stackBlockX(spec: StackBlockSpec, tick: number): number {
  const period = spec.range * 2;
  const p = (spec.phase + spec.speed * tick) % period;
  return p <= spec.range ? p : period - p;
}

export interface StackDropResult {
  placed: boolean;
  perfect: boolean;
  x: number;
  w: number;
  cut: number;
}

// 통나무를 delay 틱 뒤에 떨어뜨린다. game을 직접 바꾼다.
export function dropStackBlock(game: StackGame, delay: number): StackDropResult {
  const spec = stackBlockSpec(game);
  game.ticks += delay;
  const x = stackBlockX(spec, delay);
  const left = Math.max(x, game.prevX);
  const right = Math.min(x + spec.w, game.prevX + game.prevW);
  const overlap = right - left;
  if (overlap <= 0) {
    game.over = true;
    return { placed: false, perfect: false, x, w: 0, cut: spec.w };
  }
  const perfect = Math.abs(x - game.prevX) <= game.tolerance;
  let w: number;
  if (perfect) {
    game.streak += 1;
    game.perfects += 1;
    w = Math.min(STACK_START_W, game.prevW + (game.streak >= STACK_GROW_STREAK ? STACK_GROW : 0));
    const grown = w - game.prevW;
    game.prevX = Math.max(0, Math.min(STACK_RANGE - w, game.prevX - Math.floor(grown / 2)));
  } else {
    game.streak = 0;
    w = overlap;
    game.prevX = left;
  }
  game.prevW = w;
  game.height += 1;
  if (game.height >= STACK_MAX_HEIGHT) {
    game.over = true;
    game.completed = true;
  }
  return { placed: true, perfect, x, w, cut: spec.w - w };
}
