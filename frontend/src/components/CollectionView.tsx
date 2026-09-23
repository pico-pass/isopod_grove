import { useState } from 'react';
import type { GameState, Species } from '../api/types';
import { RARITIES } from '../utils/gameCalc';

type Filter = 'all' | 'found' | 'undiscovered';

export function CollectionView({ gameState, species }: { gameState: GameState; species: Species[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const discovered = gameState.discovered;
  const percent = species.length ? Math.round((discovered.length / species.length) * 100) : 0;

  const list = species.filter((sp) => {
    if (filter === 'all') return true;
    const found = discovered.includes(sp.speciesId);
    return filter === 'found' ? found : !found;
  });

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FIELD NOTES</p>
          <h1>
            등각류 도감 <span>{discovered.length} / {species.length}</span>
          </h1>
          <p className="subheading">낙엽 아래 숨어 있던 작은 세계를 기록해요.</p>
        </div>
      </div>

      <div className="collection-summary">
        <div>
          📖 <strong>{percent}%</strong> <span>도감 완성</span>
        </div>
        <div className="long-progress">
          <i style={{ width: `${percent}%` }} />
        </div>
        <p>발견한 종은 분양 후에도 도감에 남아요.</p>
      </div>

      <div className="filter-row" role="group" aria-label="도감 필터">
        {(['all', 'found', 'undiscovered'] as Filter[]).map((f) => (
          <button key={f} className={`filter${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? '모든 등각류' : f === 'found' ? '발견한 종' : '미발견 종'}
          </button>
        ))}
      </div>

      <div className="species-grid">
        {list.map((sp) => {
          const found = discovered.includes(sp.speciesId);
          return (
            <div key={sp.speciesId} className={`species-card${found ? '' : ' undiscovered'}`}>
              {found ? (
                <span className="pill" style={{ color: RARITIES[sp.rarity].color }}>
                  {RARITIES[sp.rarity].name}
                </span>
              ) : (
                <span className="pill">🔒 미발견</span>
              )}
              <img src="/assets/isopod.png" alt={found ? sp.name : ''} style={{ filter: found ? sp.filter : 'grayscale(1) brightness(0.4)' }} />
              <h3>{found ? sp.name : '아직 만나지 못한 친구'}</h3>
              <p>{found ? sp.latin : '숲을 탐색하며 발견해 보세요'}</p>
              <div className="card-bottom">
                <span>{found ? `${gameState.population[sp.speciesId] || 0}마리 보유` : '???'}</span>
                <span>{found ? `${sp.price} G` : '미발견'}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="footnote">종별 수익·희귀도·환경 수치는 게임을 위한 설정입니다.</p>
    </section>
  );
}
