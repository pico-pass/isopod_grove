import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { DuelActionId, Species, WantedResponse, WantedResult, WantedStatus, WantedTierId } from '../api/types';
import { formatNumber } from '../utils/gameCalc';
import { DuelPanel } from './DuelPanel';
import { FamilyBadge } from './FamilyBadge';
import { SpeciesImage } from './SpeciesImage';

const ENV_LABELS: Record<string, string> = { plain: '🌍 평범한 땅', volcano: '🌋 화산 지대', jungle: '🌳 울창한 숲', tundra: '🧊 서리 평원' };
const TIER_ICONS: Record<WantedTierId, string> = { bronze: '🥉', silver: '🥈', gold: '🥇' };

// 현상수배 보스: 매일 수배서가 한 장 붙어요. 오늘의 보스와 출전 조건을 보고, 동·은·금 중 도전할 등급과 식구를 골라 직접 싸워요.
export function WantedView({
  species,
  onStart,
  onAct,
  onForfeit,
}: {
  species: Species[];
  onStart: (speciesId: string, tier: WantedTierId) => Promise<WantedResponse | null>;
  onAct: (action: DuelActionId, rhythm?: number) => Promise<WantedResponse | null>;
  onForfeit: () => Promise<WantedResponse | null>;
}) {
  const [status, setStatus] = useState<WantedStatus | null>(null);
  const [result, setResult] = useState<{ result: WantedResult; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState<WantedTierId>('bronze');
  const [selected, setSelected] = useState('');

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getWanted());
      } catch {
        // 못 불러오면 화면이 비어 보일 뿐이다. 새로고침으로 다시 시도할 수 있다.
      }
    });
  }, []);

  const act = async (fn: () => Promise<WantedResponse | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      if (!r) return;
      if (r.status) setStatus(r.status);
      if (r.result) setResult({ result: r.result, message: r.message ?? '' });
      else if (!r.step) setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const poster = status?.poster;
  const fighters = new Map((status?.fighters ?? []).map((f) => [f.speciesId, f]));
  const owned = species.filter((s) => fighters.has(s.speciesId));
  const tierView = poster?.tiers.find((t) => t.id === tier);
  const attemptsLeft = status?.attempts.left ?? 0;
  const canStart = !!selected && !!tierView && !tierView.cleared && attemptsLeft > 0 && fighters.get(selected)?.eligible === true;

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WANTED</p>
          <h1>
            현상수배 보스{' '}
            {status && (
              <span>
                오늘 {status.attempts.left}/{status.attempts.limit}회 남음
              </span>
            )}
          </h1>
          <p className="subheading">매일 새 수배서가 붙어요. 오늘의 조건에 맞는 식구로 수배 보스를 잡고 현상금과 수배서를 모아요.</p>
        </div>
      </div>

      {!status || !poster ? (
        <p className="empty">수배서를 불러오는 중이에요…</p>
      ) : (
        <>
          <section className="panel wanted-poster">
            <div className="wanted-poster-head">
              {poster.boss && <SpeciesImage species={poster.boss} style={{ filter: poster.boss.filter }} />}
              <div>
                <p className="eyebrow">오늘의 수배 · {poster.day}</p>
                <h2>
                  {poster.boss?.name} {poster.boss && <FamilyBadge family={poster.boss.family} />}
                </h2>
                <p className="dungeon-sub">{ENV_LABELS[poster.environment]}에서 기다려요.</p>
              </div>
            </div>
            <div className="wanted-conditions" aria-label="오늘의 출전 조건">
              {poster.conditions.map((c, i) => (
                <span key={i} className="mail-chip wanted-condition">
                  📌 {c.text}
                </span>
              ))}
            </div>
          </section>

          {status.duel ? (
            <DuelPanel
              duel={status.duel}
              title={`${TIER_ICONS[status.duel.tier]} 수배 보스`}
              enemyLabel="🎯 수배 보스"
              enemyLevelLabel="수배 보스"
              enemyAttackLabel="보스 공격"
              busy={busy}
              onAct={(action, rhythm) => void act(() => onAct(action, rhythm))}
              onForfeit={() => {
                if (window.confirm('수배 전투를 포기할까요?\n도전 횟수는 돌아오지 않아요.')) void act(onForfeit);
              }}
              forfeitLabel="포기하기 (도전 1회를 쓴 채 끝나요)"
            />
          ) : (
            <>
              {result && (
                <section className={`panel wanted-result ${result.result.won ? 'won' : 'lost'}`}>
                  <h2>{result.result.won ? '🎯 수배 보스를 잡았어요!' : '💀 이번에는 놓쳤어요'}</h2>
                  <p>{result.message}</p>
                  {result.result.won && (
                    <div className="dungeon-reward-row">
                      {result.result.gold > 0 && <span>🪙 {formatNumber(result.result.gold)} G</span>}
                      {result.result.diamonds > 0 && <span>💎 +{result.result.diamonds}</span>}
                      {result.result.milestoneDiamonds > 0 && <span>📜 도감 보상 💎 +{result.result.milestoneDiamonds}</span>}
                      {result.result.newPoster && <span>🆕 수배서를 도감에 붙였어요</span>}
                    </div>
                  )}
                </section>
              )}

              <p className="nav-caption">도전할 등급</p>
              <div className="wanted-tiers" role="group" aria-label="수배 등급">
                {poster.tiers.map((t) => (
                  <button
                    key={t.id}
                    className={`wanted-tier${tier === t.id ? ' active' : ''}${t.cleared ? ' cleared' : ''}`}
                    disabled={busy}
                    onClick={() => setTier(t.id)}
                  >
                    <strong>
                      {t.icon} {t.name}등급 {t.cleared && '✅'}
                    </strong>
                    <small>
                      보스 ❤️{formatNumber(t.stats.hp)} ⚔️{formatNumber(t.stats.atk)} 🛡️{formatNumber(t.stats.def)}
                    </small>
                    <small>패턴: {t.patterns.map((p) => p.name).join(' · ')}</small>
                    <small className="wanted-bounty">
                      현상금 🪙 {formatNumber(t.gold)} G · 💎 {t.diamonds}
                    </small>
                  </button>
                ))}
              </div>

              <p className="nav-caption">출전할 식구 선택</p>
              {owned.length === 0 ? (
                <p className="empty">아직 전투에 내보낼 식구가 없어요.</p>
              ) : (
                <div className="battle-picker">
                  {owned.map((s) => {
                    const f = fighters.get(s.speciesId)!;
                    return (
                      <button
                        key={s.speciesId}
                        className={`battle-pick${selected === s.speciesId ? ' active' : ''}${f.eligible ? '' : ' unavailable'}`}
                        disabled={busy || !f.eligible}
                        title={f.reason ?? undefined}
                        onClick={() => setSelected(s.speciesId)}
                      >
                        <SpeciesImage species={s} style={{ filter: s.filter }} />
                        <span className="battle-pick-name">
                          {s.name}{' '}
                          <small className="battle-pick-level">
                            Lv.{f.effectiveLevel}
                            {f.effectiveLevel !== f.level && ` (원래 ${f.level})`}
                          </small>
                        </span>
                        <small className="battle-pick-family">{s.family && <FamilyBadge family={s.family} />}</small>
                        {!f.eligible && <small className="wanted-reason">{f.reason}</small>}
                      </button>
                    );
                  })}
                </div>
              )}
              <button className="button primary full battle-fight-button" disabled={!canStart || busy} onClick={() => void act(() => onStart(selected, tier))}>
                {attemptsLeft <= 0
                  ? '오늘 도전 횟수를 모두 썼어요 (내일 다시)'
                  : tierView?.cleared
                    ? '오늘 이 등급은 이미 깼어요'
                    : !selected
                      ? '출전할 식구를 먼저 골라주세요'
                      : busy
                        ? '준비 중...'
                        : `${tierView?.icon ?? ''} ${tierView?.name ?? ''}등급 수배 보스에 도전`}
              </button>
            </>
          )}

          <section className="panel">
            <div className="panel-heading">
              <h2>📜 수배서 도감</h2>
              <span>{status.collection.total}장</span>
            </div>
            <div className="wanted-milestones">
              {status.collection.milestones.map((m) => (
                <span key={m.count} className={`mail-chip${m.claimed ? ' wanted-claimed' : m.reached ? '' : ' wanted-locked'}`}>
                  {m.count}장 → 💎 {m.diamonds} {m.claimed ? '✔️' : ''}
                </span>
              ))}
            </div>
            {status.collection.posters.length === 0 ? (
              <p className="empty">아직 잡은 수배 보스가 없어요. 오늘 첫 수배서를 도감에 붙여 보세요.</p>
            ) : (
              <div className="wanted-collection">
                {status.collection.posters.map((p) => (
                  <div key={p.day} className="wanted-card" title={`${p.day} · ${p.name}`}>
                    <SpeciesImage species={{ name: p.name, image: p.image, filter: p.filter }} style={{ filter: p.filter }} />
                    <strong>{p.name}</strong>
                    <small>
                      {TIER_ICONS[p.tier]} {p.day}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
