import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { RestorationClaimResponse, RestorationMilestoneView, RestorationPersonalView, RestorationStatus } from '../api/types';
import { formatDuration, formatNumber } from '../utils/gameCalc';

// 숲 복원 프로젝트: 모두의 탐색·원정·배틀·던전이 한 주 동안 한 게이지에 쌓여요. 마일스톤을 넘으면 접속한 모두가 보상을 받아요.
export function RestorationView({ onClaim }: { onClaim: (id: string, last: boolean) => Promise<RestorationClaimResponse | null> }) {
  const [status, setStatus] = useState<RestorationStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getRestoration());
      } catch {
        setFailed(true);
      }
    });
  }, []);

  const claim = async (id: string, last: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await onClaim(id, last);
      if (r) setStatus(r.status);
    } finally {
      setBusy(false);
    }
  };

  const track = (items: (RestorationMilestoneView | RestorationPersonalView)[], last: boolean, label: (x: RestorationMilestoneView | RestorationPersonalView) => string) => (
    <ul className="restore-rewards">
      {items.map((x) => (
        <li key={x.id} className={x.claimed ? 'claimed' : x.reached ? 'reached' : ''}>
          <span className="restore-reward-label">{label(x)}</span>
          <span className="restore-reward-text">{x.rewardText}</span>
          <button className={x.claimable ? 'button primary' : 'button secondary'} disabled={busy || !x.claimable} onClick={() => void claim(x.id, last)}>
            {x.claimed ? '받음' : x.reached ? '🎁 받기' : '잠김'}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FOREST RESTORATION</p>
          <h1>숲 복원 프로젝트</h1>
          <p className="subheading">모두의 탐색·원정·배틀·던전이 한 주 동안 하나의 게이지에 쌓여요. 마일스톤을 넘기면 접속한 모두에게 보상이 나가요.</p>
        </div>
      </div>
      {failed && <p className="empty">복원 현황을 불러오지 못했어요. 새로고침으로 다시 시도해 주세요.</p>}
      {!status && !failed && <p className="empty">숲을 둘러보는 중이에요…</p>}
      {status && (
        <>
          <section className="panel restore-hero">
            <div className="restore-stage">
              <span className="restore-icon" aria-hidden="true">{status.stage.icon}</span>
              <div>
                <h2>{status.stage.name}</h2>
                <p>{status.stage.desc}</p>
              </div>
            </div>
            <div className="restore-gauge" role="progressbar" aria-valuemin={0} aria-valuemax={status.goal} aria-valuenow={status.points} aria-label="숲 복원 게이지">
              <div className="restore-fill" style={{ width: `${Math.min(100, (status.ratio / 1.5) * 100)}%` }} />
              {status.milestones.map((m) => (
                <span key={m.id} className={`restore-mark${m.reached ? ' reached' : ''}`} style={{ left: `${(m.percent / 150) * 100}%` }}>
                  <i>{m.percent}%</i>
                </span>
              ))}
            </div>
            <p className="restore-numbers">
              <strong>{formatNumber(status.points)}</strong> / {formatNumber(status.goal)} 점 ({Math.round(status.ratio * 100)}%) · 참여 {formatNumber(status.contributors)}명 · 이번 주 종료까지 {formatDuration(status.endsInMs / 1000)}
            </p>
            <p className="restore-counts">
              숲 탐색 {formatNumber(status.counts.explores)}회 · 원정 {formatNumber(status.counts.expeditions)}회 · 배틀 {formatNumber(status.counts.battles)}회 · 던전 {formatNumber(status.counts.dungeons)}판
            </p>
          </section>

          {status.lastWeek && (
            <section className="panel">
              <div className="panel-heading">
                <h2>📦 지난 주 못 받은 보상</h2>
                <span className="pill">{Math.round(status.lastWeek.ratio * 100)}% 달성 · 내 점수 {formatNumber(status.lastWeek.myPoints)}</span>
              </div>
              {track([...status.lastWeek.milestones, ...status.lastWeek.personal].filter((x) => x.reached), true, (x) => ('percent' in x ? `게이지 ${x.percent}%` : `내 공헌 ${x.points}점`))}
            </section>
          )}

          <div className="restore-columns">
            <section className="panel">
              <div className="panel-heading">
                <h2>🌍 모두의 보상</h2>
                <span className="pill">게이지가 넘으면 모두 받아요</span>
              </div>
              {track(status.milestones, false, (x) => ('percent' in x ? `게이지 ${x.percent}% (${formatNumber(x.points)}점)` : ''))}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>🧑‍🌾 내 공헌</h2>
                <span className="pill">{formatNumber(status.my.points)}점</span>
              </div>
              <p className="restore-today">
                오늘 쌓은 점수 {status.my.dayPoints} / {status.my.dayCap} (남은 {status.my.todayLeft}점)
              </p>
              {track(status.personal, false, (x) => `내 공헌 ${x.points}점`)}
              <p className="restore-rules">
                탐색 +{status.rules.explore} · 원정 +{status.rules.expedition} · 배틀 승리 +{status.rules.battleWin}(패배 +{status.rules.battleLose}) · 던전 5층마다 +{status.rules.dungeonPerFiveFloors}(최대 {status.rules.dungeonMax})
              </p>
            </section>
          </div>

          <section className="panel">
            <div className="panel-heading">
              <h2>🏅 이번 주 공헌 순위</h2>
            </div>
            {status.board.length === 0 ? (
              <p className="empty">아직 아무도 점수를 쌓지 않았어요. 첫 번째 숲지기가 되어 보세요!</p>
            ) : (
              <ol className="restore-board">
                {status.board.map((b) => (
                  <li key={b.rank} className={b.isMe ? 'me' : ''}>
                    <span>{b.rank}위</span>
                    <strong>{b.displayName}</strong>
                    <span>{formatNumber(b.points)}점</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
}
