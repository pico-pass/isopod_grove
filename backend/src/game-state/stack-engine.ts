// ---- 콩 쌓기 "흔들흔들 통나무 탑" ----
// 좌우로 움직이는 통나무(콩벌레)를 알맞은 때에 떨어뜨려 탑을 쌓는 게임이다. 아래 칸과 겹친 만큼만 남고 삐져나온 부분은 잘려 나가서,
// 정확히 맞출수록 통나무가 넓게 유지되고 못 맞출수록 가늘어진다. 아래 칸과 하나도 안 겹치면 끝이다. 점수는 쌓은 칸 수(높이)다.
// 콩 달리기처럼 점수를 서버가 믿을 수 있게 만든다: 게임은 초당 60번(고정 간격)의 결정적 시뮬레이션이고, 움직이는 통나무의 시작 위치는
// 서버가 준 시드로만 정해지며, 사람이 하는 일은 "새 통나무가 나오고 몇 틱 뒤에 떨어뜨렸는가" 하나뿐이다. 클라이언트는 그 틱 수 목록만 보내고
// 서버가 처음부터 다시 돌려서 높이를 스스로 계산한다. 점수를 보낼 곳이 없으니 부풀릴 수 없다.
// 프론트(utils/stack.ts)에 같은 시뮬레이션이 있다(화면용). 규칙·상수를 바꿀 땐 두 곳을 함께 고쳐야 한다. 계산은 모두 정수로만 한다.
import { seededRandom } from './dungeon-engine';

export const STACK_TPS = 60;
export const STACK_TICK_MS = 1000 / STACK_TPS;
export const STACK_RANGE = 1000; // 통나무가 움직이는 가로 폭(월드 좌표)
export const STACK_START_W = 360; // 바닥 통나무의 너비. 이보다 넓어지지는 않는다.
export const STACK_MAX_HEIGHT = 150; // 여기까지 쌓으면 완주로 끝난다.
export const STACK_MAX_DELAY = 1800; // 통나무 하나를 떨어뜨리기까지 최대 30초. 넘기면 떨어뜨린 것으로 치지 않고 끝난다.
export const STACK_MIN_DELAY = 2; // 이보다 빠른 입력은 사람이 한 것이 아니다
export const STACK_MAX_DROPS = STACK_MAX_HEIGHT + 1;

// 속도(틱당 이동 거리): 3칸마다 1씩 빨라져서 SPEED_MAX에서 멈춘다.
export const STACK_SPEED_START = 5;
export const STACK_SPEED_MAX = 17;
export const STACK_SPEED_EVERY = 3;

// 정확히 맞추기(퍼펙트): 위치 차이가 허용치 이내면 아래 칸에 딱 맞게 붙고 너비가 그대로다. 연속 퍼펙트가 STREAK 이상이면 너비가 조금 늘어난다.
// 허용치는 콩벌레(종)의 희귀도마다 다르다(높을수록 넉넉하다). 통나무 생김새·속도(시드)는 희귀도와 무관하게 같다.
export const STACK_PERFECT_TOLERANCE_BY_RARITY: readonly number[] = [6, 7, 8, 9, 10];
export const STACK_GROW_STREAK = 3;
export const STACK_GROW = 10;

export function getStackTolerance(rarity: number): number {
  const i = Number.isInteger(rarity) ? Math.max(0, Math.min(STACK_PERFECT_TOLERANCE_BY_RARITY.length - 1, rarity)) : 0;
  return STACK_PERFECT_TOLERANCE_BY_RARITY[i];
}

export const stackSpeed = (index: number): number => Math.min(STACK_SPEED_MAX, STACK_SPEED_START + Math.floor((index - 1) / STACK_SPEED_EVERY));

export interface StackGame {
  seed: number;
  tolerance: number;
  height: number; // 쌓은 칸 수(바닥 제외)
  prevX: number; // 맨 위 칸의 왼쪽 끝
  prevW: number; // 맨 위 칸의 너비
  streak: number; // 지금 연속 퍼펙트 수
  perfects: number; // 퍼펙트 총 횟수
  ticks: number; // 지금까지 쓴 틱 수(떨어뜨릴 때까지의 합)
  over: boolean;
  completed: boolean;
}

export function newStackGame(seed: number, rarity: number): StackGame {
  return { seed: seed >>> 0, tolerance: getStackTolerance(rarity), height: 0, prevX: Math.floor((STACK_RANGE - STACK_START_W) / 2), prevW: STACK_START_W, streak: 0, perfects: 0, ticks: 0, over: false, completed: false };
}

// 다음 통나무(height + 1번째)의 사양: 너비는 맨 위 칸과 같고, 왼쪽 끝이 0~range 사이를 왕복하며, 시작 위치는 시드로 정한다.
export interface StackBlockSpec {
  index: number;
  w: number;
  speed: number;
  range: number; // 왼쪽 끝이 움직일 수 있는 거리(= STACK_RANGE − w)
  phase: number; // 시작 위상(0 ~ 2*range − 1)
}
export function stackBlockSpec(game: StackGame): StackBlockSpec {
  const index = game.height + 1;
  const w = game.prevW;
  const range = Math.max(1, STACK_RANGE - w);
  const phase = Math.floor(seededRandom(game.seed, index, 51)() * range * 2);
  return { index, w, speed: stackSpeed(index), range, phase };
}

// 새 통나무가 나온 지 tick 틱 뒤의 왼쪽 끝 위치(삼각파)
export function stackBlockX(spec: StackBlockSpec, tick: number): number {
  const period = spec.range * 2;
  const p = (spec.phase + spec.speed * tick) % period;
  return p <= spec.range ? p : period - p;
}

export interface StackDropResult {
  placed: boolean; // 쌓였는가(false면 하나도 안 겹쳐서 게임이 끝난 것)
  perfect: boolean;
  x: number; // 떨어뜨린 순간의 왼쪽 끝
  w: number; // 쌓인 뒤 너비
  cut: number; // 잘려 나간 너비
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
    // 아래 칸에 딱 맞게 붙는다. 너비가 늘어날 때는 가운데를 기준으로 양쪽으로 넓어진다.
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

// 떨어뜨린 틱 수 목록 검사: 정수이고 범위 안이며 개수가 상한 이내
export function isValidStackDelays(delays: unknown): delays is number[] {
  return (
    Array.isArray(delays) &&
    delays.length >= 1 &&
    delays.length <= STACK_MAX_DROPS &&
    delays.every((d) => Number.isInteger(d) && d >= STACK_MIN_DELAY && d <= STACK_MAX_DELAY)
  );
}

export interface StackResult {
  height: number;
  perfects: number;
  ticks: number;
  completed: boolean;
  dropsUsed: number; // 시뮬레이션에 쓴 입력 수(끝난 뒤의 입력은 무시한다)
}

// 시드·희귀도·입력(떨어뜨린 틱 수들)으로 처음부터 다시 돌려서 결과를 정한다.
export function simulateStack(seed: number, rarity: number, delays: readonly number[]): StackResult {
  const game = newStackGame(seed, rarity);
  let used = 0;
  for (const d of delays) {
    if (game.over) break;
    dropStackBlock(game, d);
    used++;
  }
  return { height: game.height, perfects: game.perfects, ticks: game.ticks, completed: game.completed, dropsUsed: used };
}

// 기록이 실제로 흐른 시간보다 길 수는 없다(떨어뜨린 틱의 합 + 칸마다 쌓이는 연출 시간은 시간에 안 넣는다)
export const STACK_TIME_SLACK_MS = 3000;
export const STACK_RUN_EXPIRE_MS = 40 * 60 * 1000;
export function isStackTimePlausible(ticks: number, elapsedMs: number): boolean {
  return elapsedMs + STACK_TIME_SLACK_MS >= ticks * STACK_TICK_MS;
}

// 큰 값이 위인 순서로 정렬된 기록들의 순위(같은 높이는 같은 순위, 다음 순위는 건너뛴다: 1, 1, 3)
export function rankByHeight(heightsDescending: readonly number[]): number[] {
  const ranks: number[] = [];
  heightsDescending.forEach((h, i) => ranks.push(i > 0 && h === heightsDescending[i - 1] ? ranks[i - 1] : i + 1));
  return ranks;
}

// ---- 보상 ----
export interface StackReward {
  explorationTickets: number;
  equipmentShards: number;
  diamonds: number;
}

// 오늘 최고 높이가 N칸에 닿을 때마다 하루 한 번씩 받는 보너스. 하루 합계 🎟️1 · 🔩30 · 💎3.
export const STACK_MILESTONES: readonly { height: number; reward: StackReward }[] = [
  { height: 8, reward: { explorationTickets: 0, equipmentShards: 5, diamonds: 0 } },
  { height: 15, reward: { explorationTickets: 1, equipmentShards: 5, diamonds: 0 } },
  { height: 25, reward: { explorationTickets: 0, equipmentShards: 10, diamonds: 0 } },
  { height: 40, reward: { explorationTickets: 0, equipmentShards: 10, diamonds: 1 } },
  { height: 60, reward: { explorationTickets: 0, equipmentShards: 0, diamonds: 2 } },
];
