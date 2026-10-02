import type { ViewKey } from '../components/Sidebar';

// 알림을 눌러 들어왔을 때(#friends 같은 주소 조각, 서비스 워커 메시지) 이동할 수 있는 화면. 관리자 화면은 제외한다.
// Sidebar.tsx의 NAV_ITEMS와 같은 화면 목록이어야 한다(새 화면을 추가하면 여기에도 넣는다).
export const NAVIGABLE_VIEWS: readonly ViewKey[] = [
  'habitat',
  'collection',
  'market',
  'upgrades',
  'achievements',
  'ranking',
  'friends',
  'mail',
  'battle',
  'boss',
  'pvp',
  'equipment',
  'journal',
];
