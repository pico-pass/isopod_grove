import type { GameState, Species, Terrarium } from '../api/types';
import {
  EXPLORE_COST_BASE,
  EXPLORE_COST_STEP,
  MAX_FREE_EXPLORE_TICKETS,
  RARITIES,
  formatNumber,
  getExploreCost,
  getTotalPopulationBySpecies,
} from '../utils/gameCalc';
import { SpeciesImage } from './SpeciesImage';

export function MarketView({
  gameState,
  terrarium,
  species,
  onSell,
  onToggleLock,
  onExplore,
}: {
  gameState: GameState;
  terrarium: Terrarium;
  species: Species[];
  onSell: (speciesId: string, quantity: number, confirmLast?: boolean) => void;
  onToggleLock: (speciesId: string, locked: boolean) => void;
  onExplore: (useTicket?: boolean) => void;
}) {
  const owned = species.filter((sp) => (terrarium.population[sp.speciesId] || 0) > 0);
  const totals = getTotalPopulationBySpecies(gameState);
  const lockedIds = new Set(gameState.lockedSpecies ?? []);

  // 분양한다. 이 분양으로 계정 전체의 그 종이 0마리가 되면 먼저 확인을 받고(전설·신화는 이름을 직접 입력),
  // 확인했다는 표시(confirmLast)를 서버에 같이 보낸다. 서버도 이 표시가 없으면 거절한다.
  const sell = (sp: Species, quantity: number) => {
    if (lockedIds.has(sp.speciesId)) return;
    const isLast = (totals[sp.speciesId] || 0) - quantity <= 0;
    if (isLast) {
      const defenseNote =
        gameState.pvpDefenseSpeciesId === sp.speciesId ? '\n(투기장 방어 식구로 지정된 종이에요. 상대로 뽑히지 않게 돼요.)' : '';
      const warning = `${sp.name}의 마지막 개체까지 분양해요.\n이 종을 다시 만나려면 탐색이나 원정에서 우연히 만나야 해요.${defenseNote}`;
      if (sp.rarity >= 3) {
        const typed = window.prompt(`${warning}\n\n계속하려면 종 이름 "${sp.name}"을(를) 그대로 입력해 주세요.`);
        if (typed === null) return;
        if (typed.trim() !== sp.name) {
          window.alert('이름이 달라서 분양을 취소했어요.');
          return;
        }
      } else if (!window.confirm(`${warning}\n\n정말 분양할까요?`)) {
        return;
      }
    }
    onSell(sp.speciesId, quantity, isLast ? true : undefined);
  };
  // 탐색을 한 횟수에 따라 오르는 골드 비용(초기화되지 않고 계속 쌓인다)
  const exploreSteps = gameState.exploreCostSteps ?? 0;
  const exploreCost = getExploreCost(exploreSteps);

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
        <br />🔒 잠근 종은 분양할 수 없어요. 팔면 안 되는 식구는 잠가 두세요. 계정 전체에서 마지막 개체까지 분양할 때는 한 번 더 확인해요.
        <br />❤️ 번식하려면 한 사육장에 같은 종이 2마리 이상 있어야 해요.
        <br />📈 분양 시세는 5분마다 오르내려요. 비쌀 때 분양해 보세요!
      </div>

      <div className="market-grid">
        {owned.map((sp) => {
          const n = terrarium.population[sp.speciesId] || 0;
          const locked = lockedIds.has(sp.speciesId);
          const bulk = Math.min(5, n);
          const diffPct = sp.basePrice > 0 ? Math.round(((sp.price - sp.basePrice) / sp.basePrice) * 100) : 0;
          return (
            <article className="market-card" key={sp.speciesId}>
              <div className="market-card-top">
                <span className="pill" style={{ color: RARITIES[sp.rarity].color }}>
                  {RARITIES[sp.rarity].name}
                </span>
                <button
                  className={`lock-btn${locked ? ' on' : ''}`}
                  disabled={gameState.paused}
                  onClick={() => onToggleLock(sp.speciesId, !locked)}
                  aria-pressed={locked}
                  title={locked ? '잠금 해제' : '잠가서 분양을 막기'}
                >
                  {locked ? '🔒 잠금' : '🔓'}
                </button>
              </div>
              <SpeciesImage species={sp} style={{ filter: sp.filter }} />
              <h3>{sp.name}</h3>
              <p>
                이 사육장 {n}마리 · 전체 {totals[sp.speciesId] || n}마리
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
                  disabled={n < 1 || locked || gameState.paused}
                  onClick={() => sell(sp, 1)}
                >
                  1마리 분양
                </button>
                {bulk > 1 && (
                  <button
                    className="button primary"
                    disabled={locked || gameState.paused}
                    onClick={() => sell(sp, bulk)}
                  >
                    {bulk}마리 · {formatNumber(bulk * sp.price)} G
                  </button>
                )}
                {n > bulk && (
                  <button className="button secondary" disabled={locked || gameState.paused} onClick={() => sell(sp, n)}>
                    전부 {n}마리 · {formatNumber(n * sp.price)} G
                  </button>
                )}
              </div>
              {locked && <small className="equip-hint">🔒 잠겨 있어서 분양할 수 없어요</small>}
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
            탐색 한 번에 같은 종 2마리를 {terrarium.name}으로 데려와요. 중복 종도 만날 수 있어요. 골드 탐색은 첫
            번째가 {formatNumber(EXPLORE_COST_BASE)} G이고, 탐색을 한 번 할 때마다 {formatNumber(EXPLORE_COST_STEP)} G씩
            계속 비싸져요(초기화되지 않아요).
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
            disabled={gameState.paused}
            onClick={() => onExplore(false)}
          >
            {`${exploreSteps + 1}번째 탐색 · ${formatNumber(exploreCost)} G →`}
          </button>
          <button
            className="button secondary"
            disabled={gameState.paused || gameState.explorationTickets < 1}
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
            골드 대신 탐색권 1장으로 무료 탐색을 할 수 있어요. 탐색권은 골드로 살 수 없고, 하루에 1장씩 무료로
            채워지며(최대 {MAX_FREE_EXPLORE_TICKETS}장), 업적·일일 목표·우편 보상으로 얻을 수 있어요. 탐색권으로 한
            탐색도 탐색 횟수에는 포함돼요.
          </p>
          <p className="footnote">지금 보유 {gameState.explorationTickets}장</p>
        </div>
      </section>
    </section>
  );
}
