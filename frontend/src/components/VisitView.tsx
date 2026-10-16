import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { DecorItem, LeaderboardResult, Species, VisitResult, VisitTerrarium } from '../api/types';
import { FAMILY_LABELS, getDecorBreedBonusPercent } from '../utils/decor';
import { RARITIES } from '../utils/gameCalc';
import { loadRankingLimit, saveRankingLimit, type RankingLimit } from '../utils/rankingLimit';
import { RankingLimitPicker } from './RankingLimitPicker';
import { RankingList } from './RankingView';
import { SpeciesImage } from './SpeciesImage';
import { TerrariumDecorLayer } from './TerrariumDecorLayer';
import { WanderingCreatures } from './WanderingCreatures';

// 사육장 방문: 인기 사육장 순위와 랜덤 방문으로 구경할 사육장을 고르고, 다른 숲지기의 사육장(장식·식구)을 구경하며 좋아요를 누른다.
// 프로필·인기 사육장 순위·꾸미기 창에서 들어올 때는 targetUserId가 정해져 있다.
export function VisitView({
  targetUserId,
  species,
  decorCatalog,
  onVisit,
  onOpenProfile,
  showToast,
}: {
  targetUserId: string | null;
  species: Species[];
  decorCatalog: DecorItem[];
  onVisit: (userId: string | null) => void;
  onOpenProfile: (userId: string) => void;
  showToast: (message: string, isError?: boolean) => void;
}) {
  const [data, setData] = useState<VisitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liking, setLiking] = useState(false);
  const [board, setBoard] = useState<LeaderboardResult | null>(null);
  const [limit, setLimit] = useState<RankingLimit>(loadRankingLimit);
  const limitRef = useRef(limit);
  const [randomLoading, setRandomLoading] = useState(false);

  const speciesById = new Map(species.map((s) => [s.speciesId, s]));

  // 구경 중인 사육장을 불러온다. 대상이 바뀔 때마다 새로 읽는다(목록 화면이면 비운다).
  useEffect(() => {
    if (!targetUserId) {
      Promise.resolve().then(() => {
        setData(null);
        setError(null);
        setSelectedId(null);
      });
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getVisit(targetUserId);
        if (cancelled) return;
        setData(result);
        setSelectedId(result.terrariums[0]?.terrariumId ?? null);
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setError(e instanceof Error ? e.message : '사육장을 불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    Promise.resolve().then(run);
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  const loadBoard = useCallback(async () => {
    try {
      setBoard(await api.getLikesLeaderboard(limitRef.current));
    } catch {
      // 순위를 못 불러와도 랜덤 방문은 할 수 있다.
    }
  }, []);
  useEffect(() => {
    if (targetUserId) return;
    Promise.resolve().then(loadBoard);
  }, [targetUserId, loadBoard]);

  const changeLimit = (next: RankingLimit) => {
    limitRef.current = next;
    setLimit(next);
    saveRankingLimit(next);
    void loadBoard();
  };

  const goRandom = async () => {
    if (randomLoading) return;
    setRandomLoading(true);
    try {
      const r = await api.getRandomVisit();
      onVisit(r.userId);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '구경할 사육장을 찾지 못했어요.', true);
    } finally {
      setRandomLoading(false);
    }
  };

  const toggleLike = async (t: VisitTerrarium) => {
    if (!data || liking) return;
    setLiking(true);
    try {
      const r = await api.setTerrariumLike(data.owner.userId, t.terrariumId, !t.likedByMe);
      setData((prev) => {
        if (!prev) return prev;
        const terrariums = prev.terrariums.map((x) => (x.terrariumId === t.terrariumId ? { ...x, likedByMe: r.liked, likes: r.likes } : x));
        return { ...prev, terrariums, totalLikes: terrariums.reduce((sum, x) => sum + x.likes, 0) };
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : '좋아요를 처리하지 못했어요.', true);
    } finally {
      setLiking(false);
    }
  };

  const terrarium = data?.terrariums.find((t) => t.terrariumId === selectedId) ?? data?.terrariums[0] ?? null;

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OPEN TERRARIUMS</p>
          <h1>사육장 방문</h1>
          <p className="subheading">다른 숲지기의 사육장을 구경하고, 마음에 들면 ❤️ 좋아요를 눌러 보세요.</p>
        </div>
      </div>

      {!targetUserId && (
        <>
          <div className="visit-toolbar">
            <button className="button primary" disabled={randomLoading} onClick={() => void goRandom()}>
              🎲 랜덤 방문
            </button>
            <span className="visit-hint">랭킹·친구·채팅에서 이름을 눌러 프로필의 ‘사육장 구경하기’로도 갈 수 있어요.</span>
          </div>
          <div className="panel">
            <div className="panel-heading">
              <h2>🏆 인기 사육장</h2>
              <span>받은 좋아요 순</span>
            </div>
            <RankingLimitPicker value={limit} onChange={changeLimit} />
            <RankingList result={board} loading={false} valueOf={(v) => `❤️ ${v}`} onOpenProfile={(id) => onVisit(id)} />
          </div>
        </>
      )}

      {targetUserId && (
        <div className="visit-toolbar">
          <button className="button secondary" onClick={() => onVisit(null)}>
            ← 인기 사육장
          </button>
          <button className="button primary" disabled={randomLoading} onClick={() => void goRandom()}>
            🎲 다른 사육장 구경
          </button>
        </div>
      )}

      {targetUserId && loading && !data && <p className="empty">사육장을 불러오는 중이에요...</p>}
      {targetUserId && error && !loading && <p className="empty">{error}</p>}

      {targetUserId && data && terrarium && (
        <>
          <div className="visit-owner">
            {data.owner.avatarUrl ? (
              <img src={data.owner.avatarUrl} alt="" className="profile-avatar" />
            ) : (
              <span className="profile-avatar profile-avatar-fallback">{data.owner.displayName.slice(0, 1)}</span>
            )}
            <div>
              <h2>
                {data.owner.displayName} <small>Lv. {data.owner.level}</small>
                {data.isMe && <span className="ranking-me-badge">나</span>}
              </h2>
              {data.owner.profileMessage && <p>{data.owner.profileMessage}</p>}
            </div>
            <div className="visit-owner-side">
              <strong>❤️ {data.totalLikes}</strong>
              <button className="button secondary" onClick={() => onOpenProfile(data.owner.userId)}>
                프로필
              </button>
            </div>
          </div>
          {data.isMe && (
            <p className="visit-notice">
              {data.isPublic ? '다른 숲지기에게 보이는 내 사육장이에요.' : '지금은 비공개라 나만 볼 수 있어요. (🎨 꾸미기 창에서 공개로 바꿀 수 있어요)'}
            </p>
          )}

          <div className="terrarium-tabs" role="tablist" aria-label="사육장 선택">
            {data.terrariums.map((t) => (
              <button
                key={t.terrariumId}
                role="tab"
                aria-selected={t.terrariumId === terrarium.terrariumId}
                className={`terrarium-tab${t.terrariumId === terrarium.terrariumId ? ' active' : ''}`}
                onClick={() => setSelectedId(t.terrariumId)}
              >
                <span>{t.name}</span>
                <small>
                  {t.total}마리 · ❤️ {t.likes}
                </small>
              </button>
            ))}
          </div>

          <div className="terrarium">
            <img className="terrain-image" src="/assets/terrarium.webp" alt="" />
            <div className="terrain-shade" />
            <TerrariumDecorLayer catalog={decorCatalog} backdropId={terrarium.backdrop} propIds={terrarium.props} />
            <div className="scene-top">
              <span className="habitat-badge">🍃 {terrarium.name}</span>
            </div>
            <WanderingCreatures
              key={terrarium.terrariumId}
              population={Object.fromEntries(terrarium.residents.map((r) => [r.speciesId, r.count]))}
              speciesById={speciesById}
              paused={false}
              readOnly
            />
            <div className="scene-bottom">
              <span>
                <i className="live-dot" />
                {terrarium.total > 0 ? '식구들이 지내고 있어요' : '아직 식구가 없는 사육장이에요'}
              </span>
              <span className="scene-count">{terrarium.total}마리 거주 중</span>
            </div>
          </div>

          <div className="visit-actions">
            <button
              className={`like-btn${terrarium.likedByMe ? ' liked' : ''}`}
              disabled={liking || data.isMe}
              onClick={() => void toggleLike(terrarium)}
              title={data.isMe ? '내 사육장에는 좋아요를 누를 수 없어요' : undefined}
            >
              {terrarium.likedByMe ? '❤️' : '🤍'} 좋아요 {terrarium.likes}
            </button>
            <DecorSummary decorCatalog={decorCatalog} terrarium={terrarium} />
          </div>

          <div className="residents-heading">
            <h2>
              식구들 <span>{terrarium.residents.length}종</span>
            </h2>
          </div>
          {terrarium.residents.length === 0 && <p className="empty">아직 식구가 없어요.</p>}
          <div className="visit-residents">
            {terrarium.residents.map((r) => {
              const sp = speciesById.get(r.speciesId);
              return (
                <div className="visit-resident" key={r.speciesId}>
                  {sp && <SpeciesImage species={sp} style={{ filter: sp.filter }} />}
                  <span>
                    <strong>{r.name}</strong>
                    <small style={{ color: RARITIES[r.rarity]?.color }}>
                      {RARITIES[r.rarity]?.name} · {FAMILY_LABELS[r.family].icon} {FAMILY_LABELS[r.family].name}
                    </small>
                  </span>
                  <b>×{r.count}</b>
                </div>
              );
            })}
          </div>

          {data.isMe && (
            <div className="panel visit-likers">
              <div className="panel-heading">
                <h2>💌 최근 좋아요</h2>
                <span>{data.recentLikers.length}명</span>
              </div>
              {data.recentLikers.length === 0 && <p className="empty">아직 좋아요가 없어요. 사육장을 예쁘게 꾸며 보세요!</p>}
              {data.recentLikers.map((l, i) => (
                <button className="visit-liker" key={`${l.userId}-${l.at}-${i}`} onClick={() => onOpenProfile(l.userId)}>
                  {l.avatarUrl ? (
                    <img src={l.avatarUrl} alt="" className="ranking-avatar" />
                  ) : (
                    <span className="ranking-avatar ranking-avatar-fallback">{l.displayName.slice(0, 1)}</span>
                  )}
                  <span>
                    <b>{l.displayName}</b>님이 “{l.terrariumName}”을 좋아해요
                  </span>
                  <time>{new Date(l.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</time>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// 이 사육장에 놓인 장식 이름들과 계열별 번식 보너스
function DecorSummary({ decorCatalog, terrarium }: { decorCatalog: DecorItem[]; terrarium: VisitTerrarium }) {
  const byId = new Map(decorCatalog.map((d) => [d.decorId, d]));
  const placed = [terrarium.backdrop, ...terrarium.props].map((id) => (id ? byId.get(id) : undefined)).filter((d): d is DecorItem => !!d);
  const bonuses = (['fire', 'forest', 'frost'] as const)
    .map((family) => ({ family, percent: getDecorBreedBonusPercent(decorCatalog, terrarium.backdrop, terrarium.props, family) }))
    .filter((b) => b.percent > 0);
  if (placed.length === 0) return <span className="decor-summary empty">꾸민 장식이 없어요</span>;
  return (
    <span className="decor-summary">
      {placed.map((d) => (
        <span key={d.decorId} className="decor-chip" title={d.description}>
          {d.icon} {d.name}
        </span>
      ))}
      {bonuses.map((b) => (
        <span key={b.family} className="decor-chip bonus">
          {FAMILY_LABELS[b.family].icon} {FAMILY_LABELS[b.family].name} 번식 +{b.percent}%
        </span>
      ))}
    </span>
  );
}
