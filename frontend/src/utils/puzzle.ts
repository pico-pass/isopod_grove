import type { PuzzleBoardInfo, PuzzleCell, PuzzleMove } from '../api/types';

// 오늘의 퍼즐 굴리기 규칙(화면 애니메이션용). 백엔드(game-state/puzzle-engine.ts)에 같은 규칙이 있고, 순위·보상은 서버가
// 이동 기록을 다시 굴려 보고 정하니 여기는 화면 미리보기일 뿐이다. 규칙을 바꿀 땐 두 곳을 함께 고쳐야 한다.
const DIRECTIONS: Record<PuzzleMove, [number, number]> = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

export const sameCell = (a: PuzzleCell, b: PuzzleCell) => a.x === b.x && a.y === b.y;

// from에서 dir 방향으로 굴린 뒤 멈추는 칸: 바위·벽 앞에서 멈추고, 나뭇잎에 닿으면 거기서 멈춘다.
export function slidePuzzle(board: Pick<PuzzleBoardInfo, 'width' | 'height' | 'rocks' | 'goal'>, from: PuzzleCell, dir: PuzzleMove): PuzzleCell {
  const [dx, dy] = DIRECTIONS[dir];
  let { x, y } = from;
  for (;;) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) break;
    if (board.rocks.some((r) => r.x === nx && r.y === ny)) break;
    x = nx;
    y = ny;
    if (x === board.goal.x && y === board.goal.y) break;
  }
  return { x, y };
}

// 키보드 입력 → 이동 방향(화살표와 WASD)
export const PUZZLE_KEY_MOVES: Record<string, PuzzleMove> = {
  ArrowUp: 'U',
  ArrowDown: 'D',
  ArrowLeft: 'L',
  ArrowRight: 'R',
  w: 'U',
  s: 'D',
  a: 'L',
  d: 'R',
};

export const PUZZLE_MOVE_ARROWS: Record<PuzzleMove, string> = { U: '↑', D: '↓', L: '←', R: '→' };

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
// YYYY-MM-DD → "10월 15일 (목)"
export function formatPuzzleDay(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAYS[d.getUTCDay()]})`;
}
