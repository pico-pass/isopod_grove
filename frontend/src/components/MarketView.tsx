import { useEffect, useState } from 'react';
import type { GameState, Species, Terrarium } from '../api/types';
import {
  EXPLORE_COST,
  EXPLORE_TICKET_PRICE,
  MAX_FREE_EXPLORE_TICKETS,
  RARITIES,
  formatDuration,
  formatNumber,
  getExploreRemainingSeconds,
} from '../utils/gameCalc';
import { SpeciesImage } from './SpeciesImage';

export function MarketView({
  gameState,
  terrarium,
  species,
  onSell,
  onExplore,
  onBuyTicket,
}: {
  gameState: GameState;
  terrarium: Terrarium;
  species: Species[];
  onSell: (speciesId: string, quantity: number) => void;
  onExplore: (useTicket?: boolean) => void;
  onBuyTicket: (quantity: number) => void;
}) {
  const owned = species.filter((sp) => (terrarium.population[sp.speciesId] || 0) > 0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const exploreRemaining = getExploreRemainingSeconds(gameState, now);

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE LITTLE EXCHANGE</p>
          <h1>분양 마켓</h1>
          <p className="subheading">잘 자란 식구들에게 새집을 찾아주고, 숲을 더 넓혀요.</p>
        </div>
      </div>

      <div className="info-banner">
        📍 <b>{terrarium.name}</b> 기준이에요. 분양과 탐색은 지금 선택한 사육장에서 이루어져요.
        <br />❤️ 번식할 수 있도록 종마다 2마리는 사육장에 남겨둬요.
        <br />📈 분양 시세는 5분마다 오르내려요. 비쌀 때 분양해 보세요!
      </div>

      <div className="market-grid">
        {owned.map((sp) => {
          const n = terrarium.population[sp.speciesId] || 0;
          const available = Math.max(0, n - 2);
          const bulk = Math.min(5, available);
          const diffPct = sp.basePrice > 0 ? Math.round(((sp.price - sp.basePrice) / sp.basePrice) * 100) : 0;
          return (
            <article className="market-card" key={sp.speciesId}>
              <span className="pill" style={{ color: RARITIES[sp.rarity].color }}>
                {RARITIES[sp.rarity].name}
              </span>
              <SpeciesImage species={sp} style={{ filter: sp.filter }} />
              <h3>{sp.name}</h3>
              <p>
                보유 {n}마리 · 분양 가능 {available}마리
                <br />
                한 마리당 <strong>{formatNumber(sp.price)} G</strong>{' '}
                {Math.abs(diffPct) >= 3 && (
                  <span className={`price-trend${diffPct > 0 ? ' up' : ' down'}`}>
                    {diffPct > 0 ? '📈' : '📉'} {diffPct > 0 ? '+' : ''}
                    {diffPct}%
                  </span>
                )}
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
          <p>
            탐색 한 번에 같은 종 2마리를 {terrarium.name}으로 데려와요. 중복 종도 만날 수 있어요. 탐색은 골드·탐색권
            상관없이 20분에 한 번만 할 수 있어요.
          </p>
          <div className="odds">
            {RARITIES.map((r) => (
              <span key={r.name}>
                {r.name} {r.odds}%
              </span>
            ))}
          </div>
        </div>
        <div className="explore-buttons">
          <button
            className="button primary"
            disabled={gameState.paused || exploreRemaining > 0}
            onClick={() => onExplore(false)}
          >
            {exploreRemaining > 0
              ? `⏳ ${formatDuration(exploreRemaining)} 후 탐색 가능`
              : `숲 탐색 · ${formatNumber(EXPLORE_COST)} G →`}
          </button>
          <button
            className="button secondary"
            disabled={gameState.paused || gameState.explorationTickets < 1 || exploreRemaining > 0}
            onClick={() => onExplore(true)}
          >
            🎟️ 탐색권으로 탐색 · 보유 {gameState.explorationTickets}장
          </button>
        </div>
      </section>

      <section className="panel market-explore">
        <div>
          <p className="eyebrow">EXPLORATION TICKETS</p>
          <h2>🎟️ 숲 탐색권</h2>
          <p>
            골드 대신 탐색권 1장으로 무료 탐색을 할 수 있어요. 하루에 1장씩 무료로 채워지고(최대{' '}
            {MAX_FREE_EXPLORE_TICKETS}장), 업적·일일 목표 보상으로도 얻을 수 있어요.
          </p>
        </div>
        <div className="explore-buttons">
          <button
            className="button secondary"
            disabled={gameState.paused || gameState.coins < EXPLORE_TICKET_PRICE}
            onClick={() => onBuyTicket(1)}
          >
            1장 구매 · {formatNumber(EXPLORE_TICKET_PRICE)} G
          </button>
          <button
            className="button secondary"
            disabled={gameState.paused || gameState.coins < EXPLORE_TICKET_PRICE * 5}
            onClick={() => onBuyTicket(5)}
          >
            5장 구매 · {formatNumber(EXPLORE_TICKET_PRICE * 5)} G
          </button>
        </div>
      </section>
    </section>
  );
}
