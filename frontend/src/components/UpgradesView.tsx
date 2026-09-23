import type { GameState, Upgrade } from '../api/types';
import { formatNumber, upgradeCost } from '../utils/gameCalc';

const ICONS: Record<string, string> = {
  expand: '📐',
  leaf: '🌿',
  heart: '❤️',
  drop: '💧',
};

function effectText(upgrade: Upgrade, level: number): string {
  switch (upgrade.upgradeId) {
    case 'space':
      return `${20 + level * 20}마리`;
    case 'soil':
      return `수익 +${level * 25}%`;
    case 'nursery':
      return `번식 시간 -${level * 12}%`;
    default:
      return level ? '자동 관리' : '직접 관리';
  }
}

export function UpgradesView({
  gameState,
  upgrades,
  onUpgrade,
}: {
  gameState: GameState;
  upgrades: Upgrade[];
  onUpgrade: (upgradeId: string) => void;
}) {
  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ROOM TO GROW</p>
          <h1>사육장 업그레이드</h1>
          <p className="subheading">더 넓고, 더 촉촉하고, 더 편안한 작은 숲.</p>
        </div>
      </div>

      <div className="upgrade-grid">
        {upgrades.map((u) => {
          const level = gameState.upgrades[u.upgradeId] || 0;
          const maxed = level >= u.max;
          const cost = upgradeCost(u.cost, u.factor, level);
          return (
            <article className="upgrade-card" key={u.upgradeId}>
              <span style={{ fontSize: '1.5rem' }}>{ICONS[u.icon] || '🌿'}</span>
              <span className="upgrade-level">
                Lv. {level} / {u.max}
              </span>
              <h2>{u.name}</h2>
              <p>{u.description}</p>
              <div className="upgrade-effect">
                {effectText(u, level)} {maxed ? '' : `→ ${effectText(u, level + 1)}`}
              </div>
              <button
                className={`button full ${maxed ? 'secondary' : 'primary'}`}
                disabled={maxed || gameState.paused || gameState.coins < cost}
                onClick={() => onUpgrade(u.upgradeId)}
              >
                <span>{maxed ? '최고 단계 달성' : '업그레이드'}</span>
                <span>{maxed ? '✓' : `${formatNumber(cost)} G`}</span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
