import { getLevelProgress } from '../utils/gameCalc';

export type ViewKey =
  | 'habitat'
  | 'collection'
  | 'market'
  | 'upgrades'
  | 'achievements'
  | 'ranking'
  | 'friends'
  | 'battle'
  | 'pvp'
  | 'journal'
  | 'admin';

const NAV_ITEMS: { key: ViewKey; label: string; icon: string }[] = [
  { key: 'habitat', label: '나의 사육장', icon: '🏠' },
  { key: 'collection', label: '등각류 도감', icon: '📖' },
  { key: 'market', label: '분양 마켓', icon: '💰' },
  { key: 'upgrades', label: '사육장 업그레이드', icon: '🌱' },
  { key: 'achievements', label: '업적', icon: '🏆' },
  { key: 'ranking', label: '랭킹', icon: '📊' },
  { key: 'friends', label: '친구', icon: '🤝' },
  { key: 'battle', label: '야생 배틀', icon: '⚔️' },
  { key: 'pvp', label: '투기장', icon: '🆚' },
  { key: 'journal', label: '사육 일지', icon: '📔' },
];

export function Sidebar({
  view,
  onChange,
  populationCount,
  discoveredCount,
  speciesTotal,
  claimableAchievements,
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
      <p className="nav-caption">MY LITTLE WORLD</p>
      <nav aria-label="게임 메뉴">
        {NAV_ITEMS.map((item) => (
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
          </button>
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
