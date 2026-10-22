import type { ViewKey } from '../components/Sidebar';

// 알림을 눌러 들어왔을 때(#friends 같은 주소 조각, 서비스 워커 메시지) 이동할 수 있는 화면. 관리자 화면은 제외한다.
// Sidebar.tsx의 NAV_ITEMS와 같은 화면 목록이어야 한다(새 화면을 추가하면 여기에도 넣는다).
// 푸시 알림(새 좋아요)을 눌렀을 때 "내 사육장"을 바로 여는 주소 조각. 화면은 사육장 방문이고 대상은 나('me')다.
export const VISIT_SELF_VIEW = 'visit-me';

export interface NavigationTarget {
  view: ViewKey;
  visitTarget: string | null; // 사육장 방문 화면에서 열 유저(null이면 인기 사육장 목록)
}

// 주소 조각·서비스 워커 메시지의 화면 이름을 열 화면으로 바꾼다. 모르는 이름이면 null이다.
export function resolveNavigationTarget(raw: string | null | undefined): NavigationTarget | null {
  if (raw === VISIT_SELF_VIEW) return { view: 'visit', visitTarget: 'me' };
  if (raw && NAVIGABLE_VIEWS.includes(raw as ViewKey)) return { view: raw as ViewKey, visitTarget: null };
  return null;
}

export const NAVIGABLE_VIEWS: readonly ViewKey[] = [
  'habitat',
  'collection',
  'market',
  'expedition',
  'upgrades',
  'shop',
  'achievements',
  'ranking',
  'friends',
  'visit',
  'mail',
  'battle',
  'boss',
  'survival',
  'dungeon',
  'puzzle',
  'runner',
  'pvp',
  'equipment',
  'journal',
  'changelog',
];
