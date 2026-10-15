// ---- 콩 달리기 "달려라 콩벌레" ----
// 콩벌레가 달리면서 곰팡이를 점프로 피하는 러너 게임이다. 화면은 클라이언트가 그리지만, 점수는 서버가 믿을 수 있게 만든다:
// 게임은 초당 60번(고정 간격) 진행하는 결정적 시뮬레이션이고, 판(곰팡이 배치)은 서버가 준 시드로만 정해지며, 사람이 하는 일은
// "몇 번째 틱에 점프했는가" 하나뿐이다. 그래서 클라이언트는 점프한 틱 목록만 보내고, 서버가 같은 시뮬레이션을 처음부터 다시 돌려서
// 어디서 쓰러졌는지(= 점수)를 스스로 계산한다. 점수를 직접 보낼 곳이 없으니 점수를 부풀릴 수 없다.
// 프론트(utils/runner.ts)에 같은 시뮬레이션이 있다(화면용). 규칙·상수를 바꿀 땐 두 곳을 함께 고쳐야 한다.
// 계산은 모두 정수로만 한다(두 쪽의 결과가 한 틱도 어긋나지 않게).

export const RUNNER_TPS = 60; // 초당 틱
export const RUNNER_TICK_MS = 1000 / RUNNER_TPS;
export const RUNNER_MAX_TICKS = 21600; // 6분. 여기까지 살아남으면 완주로 끝난다.
export const RUNNER_UNITS_PER_METER = 100;
export const RUNNER_MAX_JUMPS = 4000; // 한 번에 제출할 수 있는 점프 수 상한

// 속도(틱당 이동 거리, 단위 = 월드 좌표)는 420틱(7초)마다 1씩 빨라져서 SPEED_MAX에서 멈춘다.
export const RUNNER_SPEED_START = 7;
export const RUNNER_SPEED_MAX = 22;
export const RUNNER_RAMP_TICKS = 420;
const LEVELS = RUNNER_SPEED_MAX - RUNNER_SPEED_START;

// 점프: 높이·속도는 1/1000 단위로 센다. 점프 버튼을 누르면 위로 JUMP_V로 튀어 오르고 매 틱 중력 G만큼 느려진다.
export const RUNNER_JUMP_V = 9500;
export const RUNNER_GRAVITY = 640;

// 콩벌레(종)의 희귀도에 따른 능력. 전부 "살아남기 쉬워지는" 능력이라 곰팡이 배치(시드)는 희귀도와 무관하게 같다.
// - 껍질(shields): 곰팡이에 부딪혀도 껍질이 한 겹 깨지고 버틴다. 깨진 뒤 INVULN_TICKS 동안은 부딪혀도 무사하다.
// - 점프력(jumpBoostPercent): 첫 점프의 힘이 이만큼(%) 세져서 더 높이·오래 뜬다.
// - 더블 점프(airJumps): 공중에서 한 번 더 뛸 수 있다(착지하면 다시 쓸 수 있다).
export interface RunnerAbilities {
  shields: number;
  jumpBoostPercent: number;
  airJumps: number;
}
export const RUNNER_ABILITIES_BY_RARITY: readonly RunnerAbilities[] = [
  { shields: 0, jumpBoostPercent: 0, airJumps: 0 }, // 일반
  { shields: 1, jumpBoostPercent: 0, airJumps: 0 }, // 희귀
  { shields: 1, jumpBoostPercent: 6, airJumps: 0 }, // 에픽
  { shields: 2, jumpBoostPercent: 6, airJumps: 0 }, // 전설
  { shields: 2, jumpBoostPercent: 6, airJumps: 1 }, // 신화
];
export const RUNNER_INVULN_TICKS = 90; // 껍질이 깨진 뒤 1.5초 동안 무적
export const RUNNER_AIR_JUMP_PERCENT = 90; // 공중 점프의 힘(첫 점프 대비 %)

export function getRunnerAbilities(rarity: number): RunnerAbilities {
  const index = Number.isInteger(rarity) ? Math.max(0, Math.min(RUNNER_ABILITIES_BY_RARITY.length - 1, rarity)) : 0;
  return RUNNER_ABILITIES_BY_RARITY[index];
}

// 콩벌레의 몸: 화면 왼쪽에서 BEAN_X 떨어진 곳에 고정이고 월드가 흘러온다. 충돌은 몸보다 조금 작은 판정으로 한다(INSET).
export const RUNNER_BEAN_X = 100;
export const RUNNER_BEAN_W = 40;
export const RUNNER_HIT_INSET = 6;
export const RUNNER_HIT_TOP_INSET = 3; // 곰팡이 위쪽을 이만큼 스치는 건 봐준다
export const RUNNER_VIEW_W = 900; // 화면에 보이는 월드 너비(그리기용)
const BEAN_EFF = RUNNER_BEAN_W - 2 * RUNNER_HIT_INSET;

// 곰팡이: 낮은 것(low)과 높은 것(high). 너비는 "점프 타이밍 여유"를 목표로 거꾸로 계산해서, 갈수록 여유가 줄어든다(어려워진다).
export type RunnerObstacleKind = 'low' | 'high';
export const RUNNER_OBSTACLE_HEIGHT: Record<RunnerObstacleKind, number> = { low: 24, high: 44 };
const WIN_START = 20; // 처음 곰팡이를 넘을 수 있는 점프 시작 시점의 폭(틱). 클수록 쉽다.
const WIN_END = 8; // 최고 속도에서의 폭
const WIN_VAR = 5; // 곰팡이마다 0~5틱 더 여유를 준다(들쭉날쭉하게)
const FIRST_OBSTACLE_X = 900;
const RECOVER_TICKS = 12; // 착지한 뒤 다음 곰팡이까지 최소한 남기는 여유
const EXTRA_GAP_TICKS = 26; // 곰팡이 사이 간격에 더하는 무작위 여유(최대)
const OBSTACLE_MIN_W = 26;
const OBSTACLE_MAX_W = 360;
const HIGH_FROM_LEVEL = 2;

export interface RunnerObstacle {
  x: number; // 월드 좌표의 왼쪽 끝
  w: number;
  h: number;
  kind: RunnerObstacleKind;
}

interface RunnerTrack {
  list: RunnerObstacle[];
  ensure(upTo: number): void;
}

export interface RunnerState {
  tick: number; // 지금까지 진행한 틱 수
  dist: number; // 달린 거리(월드 좌표)
  y: number; // 땅에서 뜬 높이(1/1000 단위)
  vy: number; // 위로 향하는 속도(1/1000 단위)
  dead: boolean;
  first: number; // 아직 지나가지 않은 첫 곰팡이의 번호(충돌 검사를 빠르게)
  track: RunnerTrack;
  abilities: RunnerAbilities;
  jumpV: number; // 이 콩벌레의 첫 점프 힘(점프력 능력 반영)
  airJumpV: number; // 공중 점프의 힘
  shields: number; // 남은 껍질
  airJumpsLeft: number; // 남은 공중 점프
  invuln: number; // 남은 무적 틱
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

// 점프 한 번의 높이 곡선: 점프를 누른 틱부터 매 틱 끝의 높이(땅에 닿으면 끝)
function computeArc(): number[] {
  const arc: number[] = [];
  let y = 0;
  let vy = RUNNER_JUMP_V;
  do {
    y += vy;
    vy -= RUNNER_GRAVITY;
    arc.push(y);
  } while (y > 0);
  return arc;
}
const ARC = computeArc();
export const RUNNER_AIR_TICKS = ARC.length; // 한 번 점프해서 착지할 때까지 걸리는 틱 수

// 높이 h짜리 곰팡이를 넘고 있는 동안(곡선이 그 높이 이상인 연속 구간)의 틱 수
function ticksAbove(h: number): number {
  const threshold = (h - RUNNER_HIT_TOP_INSET) * 1000;
  let best = 0;
  let run = 0;
  for (const y of ARC) {
    if (y >= threshold) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}
const TICKS_ABOVE: Record<RunnerObstacleKind, number> = {
  low: ticksAbove(RUNNER_OBSTACLE_HEIGHT.low),
  high: ticksAbove(RUNNER_OBSTACLE_HEIGHT.high),
};

const speedOfLevel = (level: number) => RUNNER_SPEED_START + Math.min(level, LEVELS);
export const runnerLevelAt = (tick: number) => Math.min(LEVELS, Math.floor(tick / RUNNER_RAMP_TICKS));
export const runnerSpeedAt = (tick: number) => speedOfLevel(runnerLevelAt(tick));

// 월드 좌표 x에 도달했을 때의 속도 단계(곰팡이를 만들 때 그 자리의 속도를 알아야 해서 필요하다)
function levelAtDistance(x: number): number {
  let d = 0;
  for (let level = 0; level < LEVELS; level++) {
    const span = speedOfLevel(level) * RUNNER_RAMP_TICKS;
    if (d + span > x) return level;
    d += span;
  }
  return LEVELS;
}

// 시드로 정해지는 곰팡이 배치. 필요한 만큼만 앞으로 이어서 만든다.
function createTrack(seed: number): RunnerTrack {
  const random = mulberry32(seed);
  const list: RunnerObstacle[] = [];
  let x = FIRST_OBSTACLE_X;
  return {
    list,
    ensure(upTo: number) {
      while (x < upTo) {
        const level = levelAtDistance(x);
        const speed = speedOfLevel(level);
        const highChance = level < HIGH_FROM_LEVEL ? 0 : Math.min(0.55, 0.15 + (level - HIGH_FROM_LEVEL) * 0.04);
        const kind: RunnerObstacleKind = random() < highChance ? 'high' : 'low';
        const baseWindow = Math.round(WIN_START + ((WIN_END - WIN_START) * Math.min(level, LEVELS)) / LEVELS);
        const window = baseWindow + Math.floor(random() * (WIN_VAR + 1));
        // 점프로 곰팡이 위에 떠 있을 수 있는 틱 수(TICKS_ABOVE)에서 목표 여유(window)를 뺀 만큼만 곰팡이가 몸과 겹쳐 있게 한다.
        const width = Math.max(OBSTACLE_MIN_W, Math.min(OBSTACLE_MAX_W, (TICKS_ABOVE[kind] - window) * speed - BEAN_EFF));
        list.push({ x, w: width, h: RUNNER_OBSTACLE_HEIGHT[kind], kind });
        x += width + speed * (RUNNER_AIR_TICKS + RECOVER_TICKS) + Math.floor(random() * speed * EXTRA_GAP_TICKS);
      }
    },
  };
}

export function createRunner(seed: number, rarity = 0): RunnerState {
  const track = createTrack(seed);
  track.ensure(RUNNER_VIEW_W * 3);
  const abilities = getRunnerAbilities(rarity);
  const jumpV = Math.floor((RUNNER_JUMP_V * (100 + abilities.jumpBoostPercent)) / 100);
  return {
    tick: 0,
    dist: 0,
    y: 0,
    vy: 0,
    dead: false,
    first: 0,
    track,
    abilities,
    jumpV,
    airJumpV: Math.floor((jumpV * RUNNER_AIR_JUMP_PERCENT) / 100),
    shields: abilities.shields,
    airJumpsLeft: abilities.airJumps,
    invuln: 0,
  };
}

// 한 틱 진행한다. jump가 true이고 땅에 있으면 점프하고, 공중이면 남은 공중 점프가 있을 때만 한 번 더 뛴다(아니면 무시).
// 점프 입력이 실제로 쓰였는지(true) 돌려준다. 화면은 쓰인 틱만 서버에 보낸다.
export function stepRunner(state: RunnerState, jump: boolean): boolean {
  if (state.dead) return false;
  let jumped = false;
  if (jump) {
    if (state.y === 0 && state.vy === 0) {
      state.vy = state.jumpV;
      jumped = true;
    } else if (state.airJumpsLeft > 0) {
      state.vy = state.airJumpV;
      state.airJumpsLeft--;
      jumped = true;
    }
  }
  if (state.y > 0 || state.vy > 0) {
    state.y += state.vy;
    state.vy -= RUNNER_GRAVITY;
    if (state.y <= 0) {
      state.y = 0;
      state.vy = 0;
      state.airJumpsLeft = state.abilities.airJumps; // 착지하면 공중 점프를 다시 쓸 수 있다
    }
  }
  state.dist += runnerSpeedAt(state.tick);
  state.tick++;
  state.track.ensure(state.dist + RUNNER_VIEW_W * 3);

  const left = state.dist + RUNNER_BEAN_X + RUNNER_HIT_INSET;
  const right = state.dist + RUNNER_BEAN_X + RUNNER_BEAN_W - RUNNER_HIT_INSET;
  const list = state.track.list;
  while (state.first < list.length && list[state.first].x + list[state.first].w <= left) state.first++;
  let hit = false;
  for (let i = state.first; i < list.length && list[i].x < right; i++) {
    if (state.y < (list[i].h - RUNNER_HIT_TOP_INSET) * 1000) {
      hit = true;
      break;
    }
  }
  // 무적 시간 중에는 부딪혀도 무사하다. 아니면 껍질이 있으면 한 겹 깨지고 버티며(그 뒤 잠깐 무적), 없으면 쓰러진다.
  const protectedNow = state.invuln > 0;
  if (protectedNow) state.invuln--;
  if (hit && !protectedNow) {
    if (state.shields > 0) {
      state.shields--;
      state.invuln = RUNNER_INVULN_TICKS;
    } else {
      state.dead = true;
    }
  }
  return jumped;
}

export const runnerMeters = (dist: number) => Math.floor(dist / RUNNER_UNITS_PER_METER);

export interface RunnerResult {
  ticks: number; // 쓰러진(또는 완주한) 틱
  dist: number;
  meters: number;
  completed: boolean; // 쓰러지지 않고 RUNNER_MAX_TICKS까지 달렸는가
  shieldsUsed: number; // 곰팡이를 막아 준 껍질 수
}

// 점프한 틱 목록(오름차순)으로 처음부터 끝까지 다시 돌려 결과를 구한다. 서버가 점수를 정하는 유일한 방법이다.
export function simulateRunner(seed: number, jumps: readonly number[], rarity = 0): RunnerResult {
  const state = createRunner(seed, rarity);
  let next = 0;
  while (!state.dead && state.tick < RUNNER_MAX_TICKS) {
    let jump = false;
    while (next < jumps.length && jumps[next] < state.tick) next++;
    if (next < jumps.length && jumps[next] === state.tick) {
      jump = true;
      next++;
    }
    stepRunner(state, jump);
  }
  return {
    ticks: state.tick,
    dist: state.dist,
    meters: runnerMeters(state.dist),
    completed: !state.dead,
    shieldsUsed: state.abilities.shields - state.shields,
  };
}

// 점프 목록이 규칙에 맞는지(정수, 범위 안, 오름차순에 중복 없음) 확인한다.
export function isValidRunnerJumps(jumps: readonly number[]): boolean {
  if (jumps.length > RUNNER_MAX_JUMPS) return false;
  let prev = -1;
  for (const t of jumps) {
    if (!Number.isInteger(t) || t < 0 || t >= RUNNER_MAX_TICKS || t <= prev) return false;
    prev = t;
  }
  return true;
}

// 큰 값이 위인 순서(내림차순)로 정렬된 기록들의 순위. 같은 거리는 같은 순위이고 다음 순위는 건너뛴다(1, 1, 3).
export function rankByDistance(metersDescending: readonly number[]): number[] {
  const ranks: number[] = [];
  metersDescending.forEach((m, i) => ranks.push(i > 0 && m === metersDescending[i - 1] ? ranks[i - 1] : i + 1));
  return ranks;
}

// ---- 보상 ----
export interface RunnerReward {
  explorationTickets: number;
  equipmentShards: number;
  diamonds: number;
}

// 오늘 최고 기록이 N미터에 닿을 때마다 하루 한 번씩 받는 보너스. 하루 합계 🎟️2 · 🔩40 · 💎2.
export const RUNNER_MILESTONES: readonly { meters: number; reward: RunnerReward }[] = [
  { meters: 150, reward: { explorationTickets: 0, equipmentShards: 5, diamonds: 0 } },
  { meters: 400, reward: { explorationTickets: 0, equipmentShards: 10, diamonds: 0 } },
  { meters: 800, reward: { explorationTickets: 1, equipmentShards: 10, diamonds: 0 } },
  { meters: 1500, reward: { explorationTickets: 0, equipmentShards: 15, diamonds: 1 } },
  { meters: 2500, reward: { explorationTickets: 1, equipmentShards: 0, diamonds: 1 } },
];

// 서버가 시작 때 적어 둔 시각 이후 실제로 흐른 시간(ms)이 시뮬레이션 시간보다 짧으면 안 된다(빨리 감기 방지). 네트워크·시계 오차 여유.
export const RUNNER_TIME_SLACK_MS = 3000;
// 시작한 지 이만큼 지난 달리기는 낡은 것으로 보고 받지 않는다(시뮬레이션 최대 6분 + 여유).
export const RUNNER_RUN_EXPIRE_MS = 40 * 60 * 1000;

export function isRunnerTimePlausible(ticks: number, elapsedMs: number): boolean {
  return elapsedMs + RUNNER_TIME_SLACK_MS >= ticks * RUNNER_TICK_MS;
}
