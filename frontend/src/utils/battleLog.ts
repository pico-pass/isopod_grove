import type { BattleTurn } from '../api/types';
import { formatNumber } from './gameCalc';

// 전투 기록 한 줄의 왼쪽 문구. 직접 전투에는 피해 없이 효과만 있는 줄이 있다(방어·회복·빙결로 상대가 못 움직인 턴)와
// 계열 기술의 화상 피해 줄이 있어서 그에 맞는 이름을 붙인다.
export function battleLogLabel(turn: BattleTurn, enemyLabel: string): string {
  if (turn.attacker === 'me') {
    if (turn.note?.startsWith('🔥 화상')) return '🔥 화상 피해';
    return turn.damage === 0 && turn.note ? '내 행동' : '내 공격';
  }
  return turn.damage === 0 && turn.note ? '상대 행동 불가' : enemyLabel;
}

// 가운데 문구: 피해가 없는 줄은 "—"
export function battleLogValue(turn: BattleTurn): string {
  return turn.damage === 0 && turn.note ? '—' : `-${formatNumber(turn.damage)}`;
}
