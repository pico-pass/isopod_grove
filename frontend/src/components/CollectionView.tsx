import { useState, type FormEvent } from 'react';
import type { GameState, Species } from '../api/types';
import { RARITIES, SPECIES_NICKNAME_MAX_LENGTH, getTotalPopulationBySpecies } from '../utils/gameCalc';
import { SpeciesImage } from './SpeciesImage';

type Filter = 'all' | 'found' | 'undiscovered';

function SpeciesCard({
  sp,
  found,
  count,
  onSetNickname,
}: {
  sp: Species;
  found: boolean;
  count: number;
  onSetNickname: (speciesId: string, nickname: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sp.name);

  const startEditing = () => {
    setDraft(sp.name);
    setEditing(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed === sp.name) {
      setEditing(false);
      return;
    }
    onSetNickname(sp.speciesId, trimmed);
    setEditing(false);
  };

  return (
    <div className={`species-card${found ? '' : ' undiscovered'}`}>
      {found ? (
        <span className="pill" style={{ color: RARITIES[sp.rarity].color }}>
          {RARITIES[sp.rarity].name}
        </span>
      ) : (
        <span className="pill">🔒 미발견</span>
      )}
      <SpeciesImage
        species={sp}
        alt={found ? sp.name : ''}
        style={{ filter: found ? sp.filter : 'grayscale(1) brightness(0.4)' }}
      />
      {found && editing ? (
        <form className="nickname-form" onSubmit={submit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={SPECIES_NICKNAME_MAX_LENGTH}
            autoFocus
            onBlur={() => setEditing(false)}
          />
          <button type="submit" className="nickname-submit" onMouseDown={(e) => e.preventDefault()}>
            완료
          </button>
        </form>
      ) : (
        <h3>
          {found ? sp.name : '아직 만나지 못한 친구'}
          {found && (
            <button className="nickname-edit-button" onClick={startEditing} title="별명 짓기">
              ✏️
            </button>
          )}
        </h3>
      )}
      <p>{found ? sp.latin : '숲을 탐색하며 발견해 보세요'}</p>
      <div className="card-bottom">
        <span>{found ? `${count}마리 보유` : '???'}</span>
        <span>{found ? `${sp.price} G` : '미발견'}</span>
      </div>
    </div>
  );
}

export function CollectionView({
  gameState,
  species,
  onSetNickname,
}: {
  gameState: GameState;
  species: Species[];
  onSetNickname: (speciesId: string, nickname: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const discovered = gameState.discovered;
  const totals = getTotalPopulationBySpecies(gameState);
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
        <p>발견한 종은 분양 후에도 도감에 남아요. ✏️를 눌러 별명을 지어줄 수 있어요(무료, 나에게만 보여요).</p>
      </div>

      <div className="filter-row" role="group" aria-label="도감 필터">
        {(['all', 'found', 'undiscovered'] as Filter[]).map((f) => (
          <button key={f} className={`filter${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? '모든 등각류' : f === 'found' ? '발견한 종' : '미발견 종'}
          </button>
        ))}
      </div>

      <div className="species-grid">
        {list.map((sp) => (
          <SpeciesCard
            key={sp.speciesId}
            sp={sp}
            found={discovered.includes(sp.speciesId)}
            count={totals[sp.speciesId] || 0}
            onSetNickname={onSetNickname}
          />
        ))}
      </div>
      <p className="footnote">종별 수익·희귀도·환경 수치는 게임을 위한 설정입니다.</p>
    </section>
  );
}
