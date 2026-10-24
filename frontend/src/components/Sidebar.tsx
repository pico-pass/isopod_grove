import { getLevelProgress } from '../utils/gameCalc';

export type ViewKey =
  | 'habitat'
  | 'collection'
  | 'market'
  | 'auction'
  | 'merchant'
  | 'expedition'
  | 'upgrades'
  | 'shop'
  | 'seasonal'
  | 'fortune'
  | 'achievements'
  | 'ranking'
  | 'friends'
  | 'visit'
  | 'mail'
  | 'battle'
  | 'boss'
  | 'survival'
  | 'dungeon'
  | 'wanted'
  | 'underdog'
  | 'skilllab'
  | 'awaken'
  | 'stack'
  | 'shopsim'
  | 'quiz'
  | 'news'
  | 'restoration'
  | 'puzzle'
  | 'runner'
  | 'pvp'
  | 'equipment'
  | 'engrave'
  | 'manager'
  | 'exhibit'
  | 'journal'
  | 'changelog'
  | 'admin';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: string;
}

// 메뉴가 늘어서 묶음으로 나눈다. 새 화면은 알맞은 묶음에 넣고 NAVIGABLE_VIEWS(utils/views.ts)에도 넣는다.
const NAV_GROUPS: { caption: string; items: NavItem[] }[] = [
  {
    caption: 'MY LITTLE WORLD',
    items: [
      { key: 'habitat', label: '나의 사육장', icon: '🏠' },
      { key: 'collection', label: '등각류 도감', icon: '📖' },
      { key: 'market', label: '분양 마켓', icon: '💰' },
      { key: 'auction', label: '매일 경매', icon: '🔨' },
      { key: 'merchant', label: '떠돌이 상인', icon: '🧳' },
      { key: 'expedition', label: '원정', icon: '🧭' },
      { key: 'upgrades', label: '사육장 업그레이드', icon: '🌱' },
      { key: 'shop', label: '부스트 상점', icon: '⚡' },
      { key: 'seasonal', label: '계절 이벤트', icon: '🎑' },
      { key: 'fortune', label: '오늘의 운세', icon: '🔮' },
      { key: 'equipment', label: '장비', icon: '🎒' },
      { key: 'engrave', label: '장비 각인 재련소', icon: '⚒️' },
      { key: 'manager', label: '사육장 관리인', icon: '🧑‍🌾' },
      { key: 'visit', label: '사육장 방문', icon: '🏡' },
      { key: 'exhibit', label: '표본 전시관', icon: '🏺' },
    ],
  },
  {
    caption: 'BATTLE',
    items: [
      { key: 'battle', label: '야생 배틀', icon: '⚔️' },
      { key: 'boss', label: '보스 타워', icon: '🗼' },
      { key: 'survival', label: '서바이벌', icon: '♾️' },
      { key: 'dungeon', label: '썩은 통나무 던전', icon: '🪵' },
      { key: 'wanted', label: '현상수배 보스', icon: '🎯' },
      { key: 'underdog', label: '하극상 대회', icon: '🐛' },
      { key: 'skilllab', label: '계열 기술 연구소', icon: '🧪' },
      { key: 'awaken', label: '전투 레벨 각성 ★', icon: '⭐' },
      { key: 'pvp', label: '투기장', icon: '🆚' },
    ],
  },
  {
    caption: 'MINI GAMES',
    items: [
      { key: 'puzzle', label: '오늘의 퍼즐', icon: '🧩' },
      { key: 'runner', label: '콩 달리기', icon: '🏃' },
      { key: 'stack', label: '콩 쌓기', icon: '🪵' },
      { key: 'shopsim', label: '버섯 가게', icon: '🏪' },
      { key: 'quiz', label: '이 콩 누구?', icon: '❓' },
    ],
  },
  {
    caption: 'COMMUNITY',
    items: [
      { key: 'ranking', label: '랭킹', icon: '📊' },
      { key: 'friends', label: '친구', icon: '🤝' },
      { key: 'mail', label: '우편함', icon: '📬' },
      { key: 'achievements', label: '업적', icon: '🏆' },
      { key: 'restoration', label: '숲 복원', icon: '🌱' },
      { key: 'news', label: '숲 신문', icon: '📰' },
    ],
  },
  {
    caption: 'RECORDS',
    items: [
      { key: 'journal', label: '사육 일지', icon: '📔' },
      { key: 'changelog', label: '업데이트 내역', icon: '📜' },
    ],
  },
];

export function Sidebar({
  view,
  onChange,
  populationCount,
  discoveredCount,
  speciesTotal,
  claimableAchievements,
  mailBadge,
  friendChatBadge,
  changelogNew,
  xp,
  isAdmin,
  mobileOpen,
  onClose,
}: {
  view: ViewKey;
  onChange: (v: ViewKey) => void;
  populationCount: number;
  discoveredCount: number;
  speciesTotal: number;
  claimableAchievements: number;
  mailBadge: number;
  friendChatBadge: number;
  changelogNew: boolean;
  xp: number;
  isAdmin: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { level, currentXp, requiredXp } = getLevelProgress(xp);
  const select = (v: ViewKey) => {
    onChange(v);
    onClose(); // 모바일 드로어에서는 항목을 고르면 자동으로 닫힌다(데스크톱에서는 영향 없음)
  };
  return (
    <>
      <div
        className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
      <div className="keeper">
        <div className="keeper-avatar">🍃</div>
        <div>
          <strong>숲지기</strong>
          <span>
            Lv. {level} · {level < 4 ? '초보 사육사' : level < 10 ? '숲의 친구' : '베테랑 숲지기'}
          </span>
        </div>
      </div>
      <div className="xp-track">
        <i style={{ width: `${(currentXp / requiredXp) * 100}%` }} />
      </div>
      <div className="xp-label">
        <span>사육사 경험치</span>
        <span>{Math.floor(currentXp)} / {requiredXp}</span>
      </div>
      <nav aria-label="게임 메뉴">
        {NAV_GROUPS.map((group) => (
          <div key={group.caption} className="nav-group">
            <p className="nav-caption">{group.caption}</p>
            {group.items.map((item) => (
          <button
            key={item.key}
            className={`nav-item${view === item.key ? ' active' : ''}`}
            onClick={() => select(item.key)}
          >
            <span>{item.icon}</span>
            {item.label}
            {item.key === 'habitat' && <span className="nav-count">{populationCount}</span>}
            {item.key === 'collection' && (
              <span className="nav-small">
                {discoveredCount}/{speciesTotal}
              </span>
            )}
            {item.key === 'achievements' && claimableAchievements > 0 && (
              <span className="nav-count">{claimableAchievements}</span>
            )}
            {item.key === 'mail' && mailBadge > 0 && <span className="nav-count">{mailBadge}</span>}
            {item.key === 'friends' && friendChatBadge > 0 && <span className="nav-count">{friendChatBadge}</span>}
            {item.key === 'changelog' && changelogNew && <span className="nav-new">NEW</span>}
          </button>
            ))}
          </div>
        ))}
      </nav>
      {isAdmin && (
        <button
          className={`nav-item admin-nav-item${view === 'admin' ? ' active' : ''}`}
          onClick={() => select('admin')}
        >
          <span>🛠️</span>서버 관리
        </button>
      )}
      </aside>
    </>
  );
}
