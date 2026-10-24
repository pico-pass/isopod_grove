import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { ExhibitResponse, ExhibitStatus, LeaderboardResult, Species } from '../api/types';
import { formatNumber } from '../utils/gameCalc';
import { loadRankingLimit, saveRankingLimit, type RankingLimit } from '../utils/rankingLimit';
import { RankingLimitPicker } from './RankingLimitPicker';
import { RankingList } from './RankingView';
import { SpeciesImage } from './SpeciesImage';

const RARITY_NAMES = ['일반', '희귀', '에픽', '전설', '신화'];

// 표본 전시관: 키우는 종의 표본을 골드로 만들어 진열해요. 동 → 은 → 금 → 화석 순으로 골드를 더 써서 등급을 올리고, 진열한 표본은 다른 숲지기가 사육장 방문 화면에서 볼 수 있어요.
export function ExhibitView({
  species,
  paused,
  onCraft,
  onDisplay,
  onShelf,
  onOpenProfile,
}: {
  species: Species[];
  paused: boolean;
  onCraft: (speciesId: string) => Promise<ExhibitResponse | null>;
  onDisplay: (speciesId: string, show: boolean) => Promise<ExhibitResponse | null>;
  onShelf: () => Promise<ExhibitResponse | null>;
  onOpenProfile: (userId: string) => void;
}) {
  const [status, setStatus] = useState<ExhibitStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ranking, setRanking] = useState<LeaderboardResult | null>(null);
  const [rankingLimit, setRankingLimit] = useState<RankingLimit>(loadRankingLimit);
  const rankingLimitRef = useRef(rankingLimit);

  const loadRanking = useCallback(async () => {
    try {
      setRanking(await api.getExhibitionLeaderboard(rankingLimitRef.current));
    } catch {
      // 순위를 못 불러와도 전시관은 쓸 수 있다.
    }
  }, []);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getExhibit());
      } catch {
        setFailed(true);
      }
      await loadRanking();
    });
  }, [loadRanking]);

  const run = async (fn: () => Promise<ExhibitResponse | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      if (r) {
        setStatus(r.status);
        void loadRanking();
      }
    } finally {
      setBusy(false);
    }
  };

  const changeLimit = (limit: RankingLimit) => {
    rankingLimitRef.current = limit;
    setRankingLimit(limit);
    saveRankingLimit(limit);
    void loadRanking();
  };

  const byId = new Map(species.map((s) => [s.speciesId, s]));
  const shownRows = status ? status.shownIds.map((id) => status.species.find((s) => s.speciesId === id)).filter((s) => !!s) : [];

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SPECIMEN HALL</p>
          <h1>
            표본 전시관 <span>보유 {status ? formatNumber(status.coins) : '…'} G</span>
          </h1>
          <p className="subheading">키우는 종의 표본을 골드로 만들어 진열해요. 동 → 은 → 금 → 화석 순으로 골드를 더 써서 등급을 올려요. 진열한 표본은 사육장 방문 화면에서 다른 숲지기가 구경하고 좋아요를 눌러요.</p>
        </div>
      </div>
      {failed && <p className="empty">전시관 정보를 불러오지 못했어요. 새로고침으로 다시 시도해 주세요.</p>}
      {!status && !failed && <p className="empty">전시관을 여는 중이에요…</p>}
      {status && (
        <>
          <section className="panel exhibit-hall">
            <div className="panel-heading">
              <h2>🏺 내 전시관</h2>
              <span className="pill">
                전시 점수 {formatNumber(status.score)} · 진열 {status.used}/{status.slots}칸
              </span>
            </div>
            {shownRows.length === 0 ? (
              <p className="empty">진열한 표본이 없어요. 아래에서 표본을 만들고 진열해 보세요.</p>
            ) : (
              <div className="exhibit-shelf">
                {shownRows.map((s) => {
                  const sp = byId.get(s.speciesId);
                  return (
                    <button key={s.speciesId} className={`exhibit-card tier-${s.tier}`} disabled={busy || paused} title="눌러서 내리기" onClick={() => void run(() => onDisplay(s.speciesId, false))}>
                      {sp && <SpeciesImage species={sp} style={{ filter: sp.filter }} />}
                      <strong>{s.name}</strong>
                      <span className="exhibit-tier">
                        {status.tiers[s.tier - 1]?.icon} {s.tierName}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="exhibit-shelf-actions">
              {status.shelfNext ? (
                <button className="button secondary" disabled={busy || paused || status.coins < status.shelfNext.gold} title={status.coins < status.shelfNext.gold ? '골드가 부족해요' : undefined} onClick={() => void run(onShelf)}>
                  🗄️ 선반 늘리기 (+{status.shelfNext.slots - status.slots}칸 → {status.shelfNext.slots}칸) · {formatNumber(status.shelfNext.gold)} G
                </button>
              ) : (
                <span className="pill">선반 최고 단계 ({status.slots}칸)</span>
              )}
              <small>
                표본 점수 = 등급 점수({status.tiers.map((t) => `${t.name} ${t.points}`).join(' · ')}) × (1 + 종 희귀도)
              </small>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>📚 표본 만들기</h2>
              <span className="pill">{status.species.filter((s) => s.tier > 0).length}종 제작</span>
            </div>
            {status.species.length === 0 && <p className="empty">아직 키우는 종이 없어요.</p>}
            <ul className="exhibit-list">
              {status.species.map((s) => {
                const sp = byId.get(s.speciesId);
                const afford = !!s.next && status.coins >= s.next.gold;
                const canCraft = !!s.next && s.owned && afford;
                return (
                  <li key={s.speciesId} className={s.shown ? 'shown' : ''}>
                    <span className="exhibit-thumb">{sp && <SpeciesImage species={sp} style={{ filter: sp.filter }} />}</span>
                    <span className="exhibit-info">
                      <strong>{s.name}</strong>
                      <small>
                        {RARITY_NAMES[s.rarity]} · {s.tier > 0 ? `${status.tiers[s.tier - 1]?.icon} ${s.tierName} (${s.score}점)` : '표본 없음'}
                        {!s.owned && ' · 지금은 키우지 않아요'}
                      </small>
                    </span>
                    {s.next ? (
                      <button
                        className="button secondary"
                        disabled={busy || paused || !canCraft}
                        title={!s.owned ? '키우고 있는 종만 만들 수 있어요' : !afford ? '골드가 부족해요' : undefined}
                        onClick={() => void run(() => onCraft(s.speciesId))}
                      >
                        {s.tier === 0 ? '표본 만들기' : `${s.next.tierName}으로`} · {formatNumber(s.next.gold)} G
                      </button>
                    ) : (
                      <span className="pill">최고 등급</span>
                    )}
                    {s.tier > 0 && (
                      <button className="button secondary" disabled={busy || paused || (!s.shown && status.used >= status.slots)} title={!s.shown && status.used >= status.slots ? '진열 칸이 가득 찼어요' : undefined} onClick={() => void run(() => onDisplay(s.speciesId, !s.shown))}>
                        {s.shown ? '내리기' : '진열'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="panel">
            <div className="panel-heading">
              <h2>🏆 전시관 순위</h2>
              <span>전시 점수 순</span>
            </div>
            <RankingLimitPicker value={rankingLimit} onChange={changeLimit} />
            <RankingList result={ranking} loading={false} valueOf={(v) => String(v)} onOpenProfile={onOpenProfile} />
          </div>
        </>
      )}
    </section>
  );
}
