import type { GameState, Species } from '../api/types';
import { RARITIES, formatNumber } from '../utils/gameCalc';

export function MarketView({
  gameState,
  species,
  onSell,
  onExplore,
}: {
  gameState: GameState;
  species: Species[];
  onSell: (speciesId: string, quantity: number) => void;
  onExplore: () => void;
}) {
  const owned = species.filter((sp) => (gameState.population[sp.speciesId] || 0) > 0);

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE LITTLE EXCHANGE</p>
          <h1>분양 마켓</h1>
          <p className="subheading">잘 자란 식구들에게 새집을 찾아주고, 숲을 더 넓혀요.</p>
        </div>
      </div>

      <div className="info-banner">❤️ 번식할 수 있도록 종마다 2마리는 사육장에 남겨둬요.</div>

      <div className="market-grid">
        {owned.map((sp) => {
          const n = gameState.population[sp.speciesId] || 0;
          const available = Math.max(0, n - 2);
          const bulk = Math.min(5, available);
          return (
            <article className="market-card" key={sp.speciesId}>
              <span className="pill" style={{ color: RARITIES[sp.rarity].color }}>
                {RARITIES[sp.rarity].name}
              </span>
              <img src="/assets/isopod.png" alt={sp.name} style={{ filter: sp.filter }} />
              <h3>{sp.name}</h3>
              <p>
                보유 {n}마리 · 분양 가능 {available}마리
                <br />
                한 마리당 <strong>{sp.price} G</strong>
              </p>
              <div className="sell-options">
                <button
                  className="button secondary"
                  disabled={available < 1 || gameState.paused}
                  onClick={() => onSell(sp.speciesId, 1)}
                >
                  1마리 분양
                </button>
                <button
                  className="button primary"
                  disabled={bulk < 1 || gameState.paused}
                  onClick={() => onSell(sp.speciesId, bulk)}
                >
                  {bulk}마리 · {formatNumber(bulk * sp.price)} G
                </button>
              </div>
            </article>
          );
        })}
        {owned.length === 0 && <p className="empty">아직 분양할 수 있는 식구가 없어요.</p>}
      </div>

      <section className="panel market-explore">
        <div>
          <p className="eyebrow">FOREST EXPLORATION</p>
          <h2>새로운 식구를 만날 시간</h2>
          <p>탐색 한 번에 같은 종 2마리를 데려와요. 중복 종도 만날 수 있어요.</p>
          <div className="odds">
            {RARITIES.map((r) => (
              <span key={r.name}>
                {r.name} {r.odds}%
              </span>
            ))}
          </div>
        </div>
        <button className="button primary" disabled={gameState.paused} onClick={onExplore}>
          숲 탐색 · 180 G →
        </button>
      </section>
    </section>
  );
}
