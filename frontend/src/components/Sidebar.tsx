export type ViewKey = 'habitat' | 'collection' | 'market' | 'upgrades' | 'journal';

const NAV_ITEMS: { key: ViewKey; label: string; icon: string }[] = [
  { key: 'habitat', label: '나의 사육장', icon: '🏠' },
  { key: 'collection', label: '등각류 도감', icon: '📖' },
  { key: 'market', label: '분양 마켓', icon: '💰' },
  { key: 'upgrades', label: '사육장 업그레이드', icon: '🌱' },
  { key: 'journal', label: '사육 일지', icon: '📔' },
];

export function Sidebar({
  view,
  onChange,
  populationCount,
  discoveredCount,
  speciesTotal,
  level,
  xp,
}: {
  view: ViewKey;
  onChange: (v: ViewKey) => void;
  populationCount: number;
  discoveredCount: number;
  speciesTotal: number;
  level: number;
  xp: number;
}) {
  return (
    <aside className="sidebar">
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
        <i style={{ width: `${xp % 100}%` }} />
      </div>
      <div className="xp-label">
        <span>사육사 경험치</span>
        <span>{Math.floor(xp % 100)} / 100</span>
      </div>
      <p className="nav-caption">MY LITTLE WORLD</p>
      <nav aria-label="게임 메뉴">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`nav-item${view === item.key ? ' active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            <span>{item.icon}</span>
            {item.label}
            {item.key === 'habitat' && <span className="nav-count">{populationCount}</span>}
            {item.key === 'collection' && (
              <span className="nav-small">
                {discoveredCount}/{speciesTotal}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
