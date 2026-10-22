// 던전의 일반 전투를 자동으로 할지 직접(턴마다 행동을 고르며) 할지. 엘리트·보스는 언제나 직접 전투다.
// 서버에는 방을 고를 때마다 "방번호:manual"로 알려 주고, 마지막으로 고른 방식은 이 브라우저에 기억한다.
export type DungeonBattleMode = 'auto' | 'manual';
export const DEFAULT_DUNGEON_BATTLE_MODE: DungeonBattleMode = 'auto';

const STORAGE_KEY = 'isopod-dungeon-battle-mode';

export function loadDungeonBattleMode(): DungeonBattleMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'manual' ? 'manual' : DEFAULT_DUNGEON_BATTLE_MODE;
  } catch {
    return DEFAULT_DUNGEON_BATTLE_MODE;
  }
}

export function saveDungeonBattleMode(mode: DungeonBattleMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // 저장하지 못해도 이번 접속에서는 고른 대로 된다.
  }
}

// 방을 고를 때 서버로 보낼 값. 직접 전투는 전투 방에만 붙인다.
export function roomChoice(index: number, roomType: string, mode: DungeonBattleMode): string {
  return roomType === 'battle' && mode === 'manual' ? `${index}:manual` : String(index);
}
