import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AwakenResponse, AwakenStatus, Species } from '../api/types';
import { formatNumber } from '../utils/gameCalc';
import { SpeciesImage } from './SpeciesImage';

const RARITY_NAMES = ['일반', '희귀', '에픽', '전설', '신화'];

// 전투 레벨 각성 ★: 전투 레벨이 충분히 오른 식구를 골드와 다이아로 각성하면 전투 레벨은 1로 돌아가지만 영구 ★가 붙어 능력치가 올라요.
// 종을 합치지 않고 제자리에서 강해지는 방식이고, ★마다 비용이 크게 늘어요. 레벨을 다시 채우는 것이 장기 목표예요.
export function AwakenView({
  species,
  paused,
  onAwaken,
}: {
  species: Species[];
  paused: boolean;
  onAwaken: (speciesId: string) => Promise<AwakenResponse | null>;
}) {
  const [status, setStatus] = useState<AwakenStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getAwaken());
      } catch {
        setFailed(true);
      }
    });
  }, []);

  const awaken = async (speciesId: string, name: string, stars: number) => {
    if (busy) return;
    if (!window.confirm(`${name}을(를) ★${stars + 1}로 각성할까요?\n전투 레벨이 1로 돌아가고 되돌릴 수 없어요.`)) return;
    setBusy(true);
    try {
      const r = await onAwaken(speciesId);
      if (r) setStatus(r.status);
    } finally {
      setBusy(false);
    }
  };

  const byId = new Map(species.map((s) => [s.speciesId, s]));
  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BATTLE AWAKENING</p>
          <h1>
            전투 레벨 각성 ★ <span>{status ? `${formatNumber(status.coins)} G · 💎 ${formatNumber(status.diamonds)}` : '…'}</span>
          </h1>
          <p className="subheading">
            {status ? `전투 레벨 ${status.requiredLevel} 이상인 식구를 각성하면` : '전투 레벨이 충분히 오른 식구를 각성하면'} 전투 레벨이 1로 돌아가는 대신 영구 ★가 붙어 능력치가 올라요. ★마다 비용이 크게 늘고,
            다시 레벨을 채우는 것이 장기 목표예요.
          </p>
        </div>
      </div>
      {failed && <p className="empty">각성 정보를 불러오지 못했어요. 새로고침으로 다시 시도해 주세요.</p>}
      {!status && !failed && <p className="empty">별빛을 모으는 중이에요…</p>}
      {status && (
        <>
          <div className="info-banner">
            ⭐ ★ 하나마다 HP·공격력·방어력이 <b>+{Math.round(status.starBonus * 100)}%</b>(장비 보너스와 곱해져요), 최대 ★{status.maxStars}. 야생 배틀·보스 타워·서바이벌·던전에 적용되고, 투기장과 하극상 대회에는
            적용되지 않아요.
          </div>
          {status.species.length === 0 && <p className="empty">아직 전투에 내보낼 식구가 없어요.</p>}
          <ul className="awaken-list">
            {status.species.map((s) => {
              const sp = byId.get(s.speciesId);
              const ratio = Math.min(1, s.level / status.requiredLevel);
              return (
                <li key={s.speciesId} className={`${s.ready ? 'ready' : ''}${s.stars > 0 ? ' starred' : ''}`}>
                  <span className="awaken-thumb">{sp && <SpeciesImage species={sp} style={{ filter: sp.filter }} />}</span>
                  <span className="awaken-info">
                    <strong>
                      {s.name} {s.stars > 0 && <span className="awaken-stars">{'★'.repeat(s.stars)}</span>}
                    </strong>
                    <small>
                      {RARITY_NAMES[s.rarity]} · 전투 Lv.{s.level}
                      {s.stars > 0 && ` · 능력치 +${Math.round(s.bonus * 100)}%`}
                      {!s.owned && ' · 지금은 키우지 않아요'}
                    </small>
                    {s.next && (
                      <span className="awaken-progress" aria-label={`각성 가능 레벨까지 ${Math.round(ratio * 100)}%`}>
                        <i style={{ width: `${ratio * 100}%` }} />
                      </span>
                    )}
                  </span>
                  {s.next ? (
                    <>
                      <span className="awaken-cost">
                        ★{s.stars + 1}: {formatNumber(s.next.gold)} G · 💎 {s.next.diamonds}
                      </span>
                      <button
                        className="button primary"
                        disabled={busy || paused || !s.ready || !s.afford}
                        title={!s.owned ? '키우고 있는 식구만 각성할 수 있어요' : s.level < status.requiredLevel ? `전투 레벨 ${status.requiredLevel}이 필요해요` : !s.afford ? '골드나 다이아가 부족해요' : undefined}
                        onClick={() => void awaken(s.speciesId, s.name, s.stars)}
                      >
                        {s.level < status.requiredLevel ? `Lv.${status.requiredLevel} 필요` : '각성'}
                      </button>
                    </>
                  ) : (
                    <span className="pill">★{status.maxStars} 최고 단계</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
