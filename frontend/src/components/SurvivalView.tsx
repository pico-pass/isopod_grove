import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type {
  GameState,
  Species,
  SurvivalBuffInfo,
  SurvivalInfo,
  SurvivalResponse,
  SurvivalRunView,
  SurvivalStageView,
  SurvivalStatus,
} from '../api/types';
import {
  RARITIES,
  formatBonusPercent,
  formatNumber,
  getTotalPopulationBySpecies,
  hasBonuses,
  type StatBonuses,
} from '../utils/gameCalc';
import { hpAfter, useBattleReplay } from '../hooks/useBattleReplay';
import { FighterCard } from './FighterCard';
import { SpeciesPickGrid } from './SpeciesPickGrid';

const BUFF_ICONS: Record<string, string> = { atk: '⚔️', def: '🛡️', hp: '❤️', heal: '🌿', regen: '💧' };

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  return (
    <div className="survival-hp">
      <div className="hp-bar">
        <i style={{ width: `${ratio * 100}%` }} />
      </div>
      <small>
        ❤️ {formatNumber(Math.max(0, hp))} / {formatNumber(maxHp)}
      </small>
    </div>
  );
}

export function SurvivalView({
  gameState,
  species,
  equipmentBonuses,
  onStart,
  onChoose,
  onRetire,
  showToast,
}: {
  gameState: GameState;
  species: Species[];
  equipmentBonuses: StatBonuses;
  onStart: (speciesId: string) => Promise<SurvivalResponse | null>;
  onChoose: (buffId: string) => Promise<SurvivalResponse | null>;
  onRetire: () => Promise<SurvivalResponse | null>;
  showToast: (message: string, isError?: boolean) => void;
}) {
  const [info, setInfo] = useState<SurvivalInfo | null>(null);
  const [status, setStatus] = useState<SurvivalStatus | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  // 가장 최근 응답(이번 구간에서 진행된 스테이지들)과 재생할 전투
  const [segment, setSegment] = useState<SurvivalResponse | null>(null);
  const [focus, setFocus] = useState<SurvivalStageView | null>(null);
  const { visibleTurns, setVisibleTurns, animating, logRef } = useBattleReplay(focus?.log);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await api.getSurvivalStatus());
    } catch (e) {
      showToast(e instanceof Error ? e.message : '서바이벌 정보를 불러오지 못했어요.', true);
    }
  }, [showToast]);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setInfo(await api.getSurvivalInfo());
      } catch {
        // 규칙 안내를 못 불러와도 진행에는 영향이 없다.
      }
      await loadStatus();
    });
  }, [loadStatus]);

  const run: SurvivalRunView | null = segment ? segment.run : (status?.run ?? null);
  const attemptsLeft = segment ? segment.attemptsLeft : (status?.attemptsLeft ?? 0);
  const bestStage = Math.max(status?.bestStage ?? 0, segment?.summary.bestStage ?? 0, gameState.stats.highestSurvivalStage ?? 0);

  const totals = getTotalPopulationBySpecies(gameState);
  const owned = species.filter((sp) => (totals[sp.speciesId] || 0) > 0);

  const apply = (r: SurvivalResponse | null) => {
    if (!r) return;
    setSegment(r);
    // 새로 진행된 구간에서 전투 기록이 있는 마지막 스테이지(엘리트를 쓰러뜨린 전투 또는 쓰러진 전투)를 자동으로 보여준다.
    const last = [...r.stages].reverse().find((s) => s.log.length > 0) ?? null;
    setFocus(last);
    setVisibleTurns(0);
    setStatus((prev) => ({ run: r.run, attemptsLeft: r.attemptsLeft, bestStage: r.summary.bestStage || prev?.bestStage || 0 }));
  };

  const start = async () => {
    if (!selected || busy || attemptsLeft <= 0) return;
    setBusy(true);
    apply(await onStart(selected));
    setBusy(false);
  };

  const choose = async (buff: SurvivalBuffInfo) => {
    if (busy) return;
    setBusy(true);
    apply(await onChoose(buff.id));
    setBusy(false);
  };

  const retire = async () => {
    if (busy || !run) return;
    if (!window.confirm(`${run.stage}스테이지에서 서바이벌을 마칠까요?\n지금까지의 보상은 이미 받았어요.`)) return;
    setBusy(true);
    apply(await onRetire());
    setBusy(false);
  };

  const showFight = (stage: SurvivalStageView) => {
    if (animating) return;
    setFocus(stage);
    setVisibleTurns(0);
  };

  const visibleLog = focus ? focus.log.slice(0, visibleTurns) : [];
  const lastTurn = visibleLog[visibleLog.length - 1];
  const myHp = focus ? hpAfter(focus.log, visibleTurns, 'me', focus.hpBefore) : 0;
  const enemyHp = focus ? hpAfter(focus.log, visibleTurns, 'enemy', focus.enemy.stats.hp) : 0;
  const rewardOf = (rarity: number) => RARITIES[rarity]?.name ?? '';

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SURVIVAL</p>
          <h1>
            서바이벌{' '}
            <span>
              최고 {bestStage}스테이지 · 오늘 남은 입장 {attemptsLeft}/{info?.dailyAttempts ?? 3}
            </span>
          </h1>
          <p className="subheading">HP를 이어가며 끝없이 싸워요. 엘리트를 쓰러뜨릴 때마다 버프를 하나 골라 더 멀리 가 보세요.</p>
        </div>
      </div>

      <div className="info-banner">
        ♾️ 식구 한 마리로 입장해서 {info?.eliteEvery ?? 5}스테이지마다 나오는 엘리트(보스 패턴)를 쓰러뜨리면 버프 3개 중 하나를 골라요.
        스테이지를 깰 때마다 최대 HP의 {Math.round((info?.healRate ?? 0.15) * 100)}%가 회복되고, 내 HP가 0이 되면 끝나요. 입장할 때의
        능력치는 그 런이 끝날 때까지 고정이에요. 스테이지마다 골드·경험치를 받고, 최고 기록을 넘으면 {info?.rewards.milestoneEvery ?? 5}스테이지
        단위로 💎{info?.rewards.milestoneDiamonds ?? 2}, 10·20·30·40스테이지를 처음 돌파하면 장비 복사본을 받아요.
      </div>

      {run ? (
        <section className="panel survival-run">
          <div className="survival-run-head">
            <h2>
              {run.speciesName} <small>Lv.{run.level}</small>
            </h2>
            <span className="pill">{run.stage}스테이지 돌파</span>
          </div>
          <HpBar hp={run.hp} maxHp={run.maxHp} />
          <div className="survival-run-stats">
            <span>⚔️ {formatNumber(run.atk)}</span>
            <span>🛡️ {formatNumber(run.def)}</span>
            <span>💧 클리어 회복 {Math.round(run.healRate * 100)}%</span>
            <span>
              이번 런 +{formatNumber(run.goldEarned)} G · 경험치 +{formatNumber(run.xpEarned)}
              {run.diamondsEarned > 0 ? ` · 💎 ${run.diamondsEarned}` : ''}
            </span>
          </div>
          {(run.buffs.atk > 0 || run.buffs.def > 0 || run.buffs.hp > 0 || run.buffs.regen > 0) && (
            <div className="survival-buffs">
              {run.buffs.atk > 0 && <span className="mail-chip">⚔️ 날카로운 이빨 ×{run.buffs.atk}</span>}
              {run.buffs.def > 0 && <span className="mail-chip">🛡️ 단단한 껍질 ×{run.buffs.def}</span>}
              {run.buffs.hp > 0 && <span className="mail-chip">❤️ 튼튼한 체력 ×{run.buffs.hp}</span>}
              {run.buffs.regen > 0 && <span className="mail-chip">💧 빠른 회복 ×{run.buffs.regen}</span>}
            </div>
          )}
          {run.choices.length > 0 && (
            <>
              <p className="nav-caption">🎁 엘리트를 쓰러뜨렸어요! 버프를 하나 골라 주세요</p>
              <div className="survival-choices">
                {run.choices.map((c) => (
                  <button key={c.id} className="survival-choice" disabled={busy} onClick={() => void choose(c)}>
                    <span className="survival-choice-icon">{BUFF_ICONS[c.id] ?? '✨'}</span>
                    <strong>{c.name}</strong>
                    <small>{c.description}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          <button className="button secondary full" onClick={() => void retire()} disabled={busy}>
            여기서 마치기
          </button>
        </section>
      ) : (
        <>
          <p className="nav-caption">입장할 식구 선택</p>
          {owned.length === 0 ? (
            <p className="empty">아직 전투에 내보낼 식구가 없어요.</p>
          ) : (
            <SpeciesPickGrid
              species={owned}
              gameState={gameState}
              activeId={selected}
              disabled={busy}
              bonuses={equipmentBonuses}
              onPick={setSelected}
            />
          )}
          {hasBonuses(equipmentBonuses) && (
            <div className="info-banner">
              🎒 장착 장비 — 공격력 {formatBonusPercent(equipmentBonuses.atk)} · 방어력 {formatBonusPercent(equipmentBonuses.def)} · HP{' '}
              {formatBonusPercent(equipmentBonuses.hp)}가 입장할 때 적용돼요.
            </div>
          )}
          <button className="button primary full battle-fight-button" disabled={!selected || busy || attemptsLeft <= 0} onClick={() => void start()}>
            {attemptsLeft <= 0
              ? '오늘 입장 횟수를 모두 썼어요 (내일 다시)'
              : !selected
                ? '입장할 식구를 먼저 골라주세요'
                : busy
                  ? '진행 중...'
                  : '♾️ 서바이벌 입장'}
          </button>
        </>
      )}

      {segment && (
        <section className="panel survival-result">
          <div className={`battle-banner ${segment.status === 'dead' ? 'lose' : segment.status === 'retired' ? 'ongoing' : 'win'}`}>
            {segment.status === 'dead' && `💧 ${segment.summary.finalStage}스테이지에서 쓰러졌어요`}
            {segment.status === 'cleared' && '🏆 모든 스테이지를 돌파했어요!'}
            {segment.status === 'choose' && `🎉 ${segment.summary.finalStage}스테이지 돌파`}
            {segment.status === 'retired' && `🏁 ${segment.summary.finalStage}스테이지에서 마쳤어요`}
          </div>
          <p className="battle-reward">
            {segment.summary.gold > 0 || segment.summary.xp > 0 ? (
              <>
                +{formatNumber(segment.summary.gold)} G · 경험치 +{formatNumber(segment.summary.xp)}
                {segment.summary.diamonds > 0 && ` · 💎 ${segment.summary.diamonds}개`}
                {segment.summary.equipment.map((e) => ` · 🎒 ${rewardOf(e.rarity)} ${e.name}${e.isNew ? '(새 장비!)' : ' 복사본 +1'}`).join('')}
              </>
            ) : (
              segment.message
            )}
            {segment.summary.newBest && ` · 🆕 최고 기록 ${segment.summary.bestStage}스테이지`}
          </p>

          {segment.stages.length > 0 && (
            <div className="survival-stages">
              {segment.stages.map((st) => (
                <button
                  key={st.stage}
                  className={`survival-stage${st.isElite ? ' elite' : ''}${st.won ? '' : ' lost'}${focus?.stage === st.stage ? ' focused' : ''}`}
                  onClick={() => showFight(st)}
                  disabled={st.log.length === 0}
                  title={st.log.length > 0 ? '전투 다시 보기' : undefined}
                >
                  <strong>{st.stage}</strong>
                  <span className="survival-stage-enemy">
                    {st.isElite ? '👹 ' : ''}
                    {st.enemy.name}
                    {st.isElite && st.patterns.length > 0 && <small> · {st.patterns.map((p) => p.name).join('+')}</small>}
                  </span>
                  <span className="survival-stage-hp">
                    ❤️ {formatNumber(st.hpBefore)} → {formatNumber(st.hpAfter)}
                  </span>
                  <span>{st.won ? '✓' : '✗'}</span>
                </button>
              ))}
            </div>
          )}

          {focus && segment.mine && (
            <>
              <p className="nav-caption">
                {focus.stage}스테이지 {focus.isElite ? '엘리트 ' : ''}전투
              </p>
              <div className="battle-vs">
                <FighterCard fighter={segment.mine} label="내 식구" hp={myHp} acting={lastTurn?.attacker === 'me'} />
                <span className="battle-vs-mark">VS</span>
                <FighterCard
                  fighter={{ ...focus.enemy, level: focus.stage, levelLabel: `${focus.stage}스테이지` }}
                  label={focus.isElite ? '👹 엘리트' : '적'}
                  hp={enemyHp}
                  acting={lastTurn?.attacker === 'enemy'}
                />
              </div>
              <div className="battle-log" ref={logRef}>
                {visibleLog.map((turn, i) => (
                  <div key={i}>
                    <div className={`battle-log-row ${turn.attacker}`}>
                      <span>{turn.attacker === 'me' ? '내 공격' : '적 공격'}</span>
                      <span>-{formatNumber(turn.damage)}</span>
                      <span>남은 HP {formatNumber(turn.remainingHp)}</span>
                    </div>
                    {turn.note && <div className="battle-log-note">{turn.note}</div>}
                  </div>
                ))}
              </div>
              {animating && (
                <button className="button secondary full" onClick={() => setVisibleTurns(focus.log.length)}>
                  ⏭ 결과 바로 보기
                </button>
              )}
            </>
          )}
        </section>
      )}
    </section>
  );
}
