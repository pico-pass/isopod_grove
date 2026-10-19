import { useEffect, useState } from 'react';
import type { Species } from '../api/types';
import { FAMILY_LABELS } from '../utils/decor';
import { RARITIES } from '../utils/gameCalc';
import { SNOOZE_HOURS, pickActivePromo, snoozePromo, type PromoPopup as Promo } from '../utils/promoPopup';
import { SpeciesImage } from './SpeciesImage';

// 접속하면 뜨는 홍보 팝업(새 콩벌레 소개). 보여줄 종이 하나도 없으면(목록에 아직 없으면) 띄우지 않는다.
export function PromoPopup({ userId, species }: { userId: string; species: Species[] }) {
  // 열지 말지는 처음 한 번만 정한다(닫은 뒤에 다시 계산하지 않는다).
  const [promo, setPromo] = useState<Promo | null>(() => pickActivePromo(userId));

  useEffect(() => {
    if (!promo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPromo(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [promo]);

  if (!promo) return null;
  const byId = new Map(species.map((s) => [s.speciesId, s]));
  const items = promo.speciesIds
    .map((id) => byId.get(id))
    .filter((s): s is Species => !!s)
    .sort((a, b) => b.rarity - a.rarity);
  if (items.length === 0) return null;

  const close = () => setPromo(null);
  const snooze = () => {
    snoozePromo(userId, promo.id);
    setPromo(null);
  };

  return (
    <div className="modal-overlay promo-overlay" onClick={close}>
      <div className="modal-card promo-modal" role="dialog" aria-label={promo.title} onClick={(e) => e.stopPropagation()}>
        <div className="promo-banner">
          <span className="promo-new">NEW</span>
          <h2>{promo.title}</h2>
          <p>{promo.subtitle}</p>
        </div>
        <div className="promo-grid">
          {items.map((s) => {
            const rarity = RARITIES[s.rarity];
            return (
              <div key={s.speciesId} className={`promo-species rarity-${s.rarity}`} style={{ ['--rarity-color' as string]: rarity?.color }}>
                <div className="promo-species-img">
                  <SpeciesImage species={s} style={{ filter: s.filter }} draggable={false} />
                </div>
                <strong>{s.name}</strong>
                <span className="promo-rarity" style={{ color: rarity?.color }}>
                  {rarity?.name}
                  {s.family ? ` · ${FAMILY_LABELS[s.family].icon} ${FAMILY_LABELS[s.family].name}` : ''}
                </span>
              </div>
            );
          })}
        </div>
        <div className="promo-actions">
          <button className="button secondary" onClick={snooze}>
            {SNOOZE_HOURS}시간 동안 닫기
          </button>
          <button className="button primary" onClick={close}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
