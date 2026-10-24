import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Species, UnderdogMatchResponse, UnderdogOpponent, UnderdogStatus, UnderdogStatusResponse } from '../api/types';
import { hpAfter, useBattleReplay } from '../hooks/useBattleReplay';
import { formatNumber } from '../utils/gameCalc';
import { FamilyBadge } from './FamilyBadge';
import { FighterCard } from './FighterCard';
import { SpeciesImage } from './SpeciesImage';

function formatRemaining(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return days > 0 ? `${days}일 ${hours}시간` : `${hours}시간 ${minutes}분`;
}

// 하극상 대회: 희귀도 '일반' 콩벌레만 나가는 주간 승점 대회. 장비 없이 레벨로만 겨루고, 한 주가 끝나면 순위 보상을 받아요.
export function UnderdogView({
  species,
  onEnter,
  onMatch,
  onClaim,
}: {
  species: Species[];
  onEnter: (speciesId: string) => Promise<UnderdogStatusResponse | null>;
  onMatch: (opponentUserId: string) => Promise<UnderdogMatchResponse | null>;
  onClaim: () => Promise<UnderdogStatusResponse | null>;
}) {
  const [status, setStatus] = useState<UnderdogStatus | null>(null);
  const [opponent, setOpponent] = useState<UnderdogOpponent | null>(null);
  const [result, setResult] = useState<UnderdogMatchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const { visibleTurns, setVisibleTurns, animating, logRef } = useBattleReplay(result?.result.log);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getUnderdog());
      } catch {
        // 못 불러오면 화면이 비어 보일 뿐이다. 새로고침으로 다시 시도할 수 있다.
      }
    });
  }, []);

  const run = async (fn: () => Promise<{ status: UnderdogStatus } | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      if (r) setStatus(r.status);
      return r;
    } finally {
      setBusy(false);
    }
  };

  const findOpponent = async () => {
    if (busy || animating) return;
    setBusy(true);
    try {
      setOpponent((await api.underdogOpponent()).opponent);
    } catch {
      setOpponent(null);
    } finally {
      setBusy(false);
    }
  };

  const fight = async () => {
    if (!opponent || busy || animating) return;
    const r = await run(() => onMatch(opponent.userId));
    if (r && 'result' in r) {
      setVisibleTurns(0);
      setResult(r as UnderdogMatchResponse);
      setOpponent(null);
    }
  };

  const bySpecies = new Map(species.map((s) => [s.speciesId, s]));
  const me = status?.me ?? null;
  const mySpecies = me ? bySpecies.get(me.speciesId) : undefined;
  const lastTurn = result && visibleTurns > 0 ? result.result.log[Math.min(visibleTurns, result.result.log.length) - 1] : undefined;
  const visibleLog = result ? result.result.log.slice(0, visibleTurns) : [];

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">UNDERDOG CUP</p>
          <h1>
            하극상 대회{' '}
            {status && (
              <span>
                이번 주 {formatRemaining(status.weekEndsInMs)} 남음
              </span>
            )}
          </h1>
          <p className="subheading">희귀도 '일반' 콩벌레만 나갈 수 있어요. 장비 없이 레벨과 운으로 겨뤄서 승점을 모으고, 주가 끝나면 순위 보상을 받아요.</p>
        </div>
      </div>

      {!status ? (
        <p className="empty">대회 정보를 불러오는 중이에요…</p>
      ) : (
        <>
          {status.lastWeek && (
            <section className="panel underdog-lastweek">
              <div className="panel-heading">
                <h2>🏁 지난 주 결과</h2>
                <span>
                  {status.lastWeek.rank ? `${status.lastWeek.rank}위 / ${status.lastWeek.participants}명` : '순위 없음'}
                </span>
              </div>
              <p className="dungeon-sub">
                승점 {formatNumber(status.lastWeek.points)} · {status.lastWeek.wins}승 {status.lastWeek.losses}패
                {status.lastWeek.reward ? ` · ${status.lastWeek.reward.label}` : ` · 경기 ${status.rules.minMatchesForReward}번 이상이어야 보상이 있어요`}
              </p>
              {status.lastWeek.reward && (
                <button
                  className="button primary full"
                  disabled={busy || !status.lastWeek.claimable}
                  onClick={() => void run(onClaim)}
                >
                  {status.lastWeek.claimed
                    ? '이미 받았어요'
                    : `🎁 보상 받기 · ${formatNumber(status.lastWeek.reward.gold)} G${status.lastWeek.reward.diamonds ? ` · 💎 ${status.lastWeek.reward.diamonds}` : ''}`}
                </button>
              )}
            </section>
          )}

          <section className="panel">
            <div className="panel-heading">
              <h2>🐛 나의 출전 식구</h2>
              {me && <span>오늘 {me.matchesLeft}/{status.rules.dailyMatches}경기 남음</span>}
            </div>
            {me && mySpecies ? (
              <div className="dungeon-guardian-card">
                <SpeciesImage species={mySpecies} style={{ filter: mySpecies.filter }} />
                <div>
                  <strong>{mySpecies.name}</strong> {mySpecies.family && <FamilyBadge family={mySpecies.family} />}
                  <p className="dungeon-sub">
                    승점 {formatNumber(me.points)} · {me.wins}승 {me.losses}패{me.rank ? ` · 현재 ${me.rank}위` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <p className="empty">아직 이번 주 출전 식구를 정하지 않았어요. 아래에서 '일반' 콩벌레를 골라 주세요.</p>
            )}
            <details className="dungeon-guardian-pick" open={!me}>
              <summary>{me ? '출전 식구 바꾸기 (승점은 그대로예요)' : '출전 식구 고르기'}</summary>
              {status.eligible.length === 0 ? (
                <p className="empty">가지고 있는 '일반' 콩벌레가 없어요.</p>
              ) : (
                <div className="battle-picker">
                  {status.eligible.map((s) => (
                    <button
                      key={s.speciesId}
                      className={`battle-pick${me?.speciesId === s.speciesId ? ' active' : ''}`}
                      disabled={busy}
                      onClick={() => void run(() => onEnter(s.speciesId))}
                    >
                      <SpeciesImage species={s} style={{ filter: s.filter }} />
                      <span className="battle-pick-name">
                        {s.name} <small className="battle-pick-level">Lv.{s.level}</small>
                      </span>
                      {s.family && (
                        <small className="battle-pick-family">
                          <FamilyBadge family={s.family} />
                        </small>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </details>
          </section>

          {me && (
            <section className="panel">
              <div className="panel-heading">
                <h2>⚔️ 경기</h2>
                <span>승 +{status.rules.winPoints} · 패 −{status.rules.lossPoints}</span>
              </div>
              <button className="button secondary full" disabled={busy || animating} onClick={() => void findOpponent()}>
                🔎 상대 찾기
              </button>
              {opponent && (
                <div className="underdog-opponent">
                  <SpeciesImage species={{ name: opponent.speciesName, image: opponent.image, filter: opponent.filter }} style={{ filter: opponent.filter }} />
                  <div>
                    <strong>{opponent.displayName}</strong>
                    <p className="dungeon-sub">
                      {opponent.speciesName} · Lv.{opponent.level}
                      {opponent.npc ? ' · 이번 주 출전자가 없어서 야생 선수와 겨뤄요(승점 절반)' : ` · 승점 ${formatNumber(opponent.points)}`}
                    </p>
                  </div>
                  <button className="button primary" disabled={busy || animating || me.matchesLeft <= 0} onClick={() => void fight()}>
                    {me.matchesLeft <= 0 ? '오늘 경기를 모두 치렀어요' : '도전!'}
                  </button>
                </div>
              )}
            </section>
          )}

          {result && (
            <section className="panel battle-result">
              <div className={`battle-banner ${animating ? 'ongoing' : result.result.won ? 'win' : 'lose'}`}>
                {animating ? '⚔️ 경기 중...' : result.result.won ? '🎉 승리!' : '💧 패배...'}
              </div>
              <div className="battle-vs">
                <FighterCard fighter={result.result.mine} label="내 식구" hp={hpAfter(result.result.log, visibleTurns, 'me', result.result.mine.stats.hp)} acting={lastTurn?.attacker === 'me'} />
                <span className="battle-vs-mark">VS</span>
                <FighterCard
                  fighter={result.result.opponent}
                  label={`${result.result.opponent.displayName}의 식구`}
                  hp={hpAfter(result.result.log, visibleTurns, 'enemy', result.result.opponent.stats.hp)}
                  acting={lastTurn?.attacker === 'enemy'}
                />
              </div>
              <div className="battle-log" ref={logRef}>
                {visibleLog.map((turn, i) => (
                  <div key={i} className={`battle-log-row ${turn.attacker}`}>
                    <span>{turn.attacker === 'me' ? '내 공격' : '상대 공격'}</span>
                    <span>-{formatNumber(turn.damage)}</span>
                    <span>남은 HP {formatNumber(turn.remainingHp)}</span>
                  </div>
                ))}
              </div>
              {animating ? (
                <button className="button secondary full" onClick={() => setVisibleTurns(result.result.log.length)}>
                  ⏭ 결과 바로 보기
                </button>
              ) : (
                <p className="battle-reward">
                  승점 {result.result.pointsDelta >= 0 ? '+' : ''}
                  {result.result.pointsDelta}
                  {result.result.gold > 0 && ` · +${formatNumber(result.result.gold)} G`}
                  {result.result.vsNpc && ' · 야생 선수와의 경기'}
                </p>
              )}
            </section>
          )}

          <section className="panel">
            <div className="panel-heading">
              <h2>🏆 이번 주 순위</h2>
              <span>{status.participants}명 출전</span>
            </div>
            {status.board.length === 0 ? (
              <p className="empty">아직 출전한 사람이 없어요. 첫 출전자가 되어 보세요!</p>
            ) : (
              <div className="underdog-board">
                {status.board.map((row) => (
                  <div key={row.userId} className={`underdog-row${row.isMe ? ' me' : ''}`}>
                    <b>{row.rank}</b>
                    <SpeciesImage species={{ name: row.speciesName, image: row.image, filter: row.filter }} style={{ filter: row.filter }} />
                    <span>
                      {row.displayName}
                      <small> · {row.speciesName}</small>
                    </span>
                    <span className="underdog-points">
                      {formatNumber(row.points)}점 <small>{row.wins}승 {row.losses}패</small>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="dungeon-sub">
              보상(경기 {status.rules.minMatchesForReward}번 이상):{' '}
              {status.rules.rewards.map((r) => `${r.label} ${formatNumber(r.gold)} G${r.diamonds ? ` + 💎${r.diamonds}` : ''}`).join(' · ')}
            </p>
          </section>
        </>
      )}
    </section>
  );
}
