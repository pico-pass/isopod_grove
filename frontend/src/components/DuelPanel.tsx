import { Fragment, useEffect, useRef } from 'react';
import type { DuelActionId, DuelCoreView } from '../api/types';
import { formatNumber } from '../utils/gameCalc';
import { BattleRulesBanner } from './BattleRulesBanner';
import { FighterCard } from './FighterCard';

const ACTION_ICONS: Record<DuelActionId, string> = { attack: '⚔️', guard: '🛡️', strike: '💥', heal: '🌿' };

// 진행 중인 직접 전투 화면(보스 타워·야생 배틀·서바이벌 엘리트가 같이 쓴다). 서버가 보낸 상태·예고·행동 목록을 그대로 보여주고,
// 고른 행동을 돌려준다. onForfeit을 주지 않으면 포기 버튼은 없다(서바이벌은 런 화면의 '여기서 마치기'를 쓴다).
export function DuelPanel({
  duel,
  title,
  enemyLabel,
  enemyLevelLabel,
  enemyAttackLabel,
  busy,
  onAct,
  onForfeit,
  forfeitLabel,
}: {
  duel: DuelCoreView;
  title: string; // 예: "[쉬움] 5층 보스"
  enemyLabel: string; // 예: "👹 보스"
  enemyLevelLabel: string; // 상대 카드에 표시할 레벨 문구
  enemyAttackLabel: string; // 로그에서 상대 행동을 부르는 말
  busy: boolean;
  onAct: (action: DuelActionId) => void;
  onForfeit?: () => void;
  forfeitLabel?: string;
}) {
  const { state, intent, log } = duel;
  const logRef = useRef<HTMLDivElement>(null);
  const lastTurn = log[log.length - 1];

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [log.length]);

  const patternNames = duel.patterns.map((p) => p.name).join(' · ');

  return (
    <section className="panel duel-panel">
      <div className="duel-head">
        <strong>🎮 직접 전투</strong>
        <span>
          {title} · {Math.min(state.turn, duel.maxTurns)} / {duel.maxTurns}턴
        </span>
      </div>

      {duel.rules && <BattleRulesBanner rules={duel.rules} />}

      <div className="battle-vs">
        <FighterCard fighter={duel.mine} label="내 식구" hp={state.myHp} acting={lastTurn?.attacker === 'me'} />
        <span className="battle-vs-mark">VS</span>
        <FighterCard
          fighter={{ ...duel.enemy, levelLabel: enemyLevelLabel }}
          label={enemyLabel}
          hp={state.bossHp}
          acting={lastTurn?.attacker === 'enemy'}
        />
      </div>

      <div className="duel-status">
        {state.charged && <span className="mail-chip">⚡ 힘을 모았어요 (다음 공격 강화)</span>}
        {state.enraged && <span className="mail-chip duel-danger">🔥 상대 분노 중</span>}
        {state.strikeCooldown > 0 && <span className="mail-chip">💥 일격 {state.strikeCooldown}턴 뒤</span>}
        {state.healUsed && <span className="mail-chip">🌿 회복 사용함</span>}
        {patternNames && <span className="mail-chip">패턴: {patternNames}</span>}
      </div>

      {(intent.heavy || intent.guard) && (
        <div className="duel-intent" role="status">
          {intent.heavy && <p>💥 이번 턴 상대가 <b>강타</b>를 준비하고 있어요! 방어 태세로 받는 피해를 줄일 수 있어요.</p>}
          {intent.guard && <p>🛡️ 이번 턴 상대가 <b>웅크려요</b>! 내가 주는 피해가 크게 줄어요. 공격은 아껴 두고 힘을 모아 보세요.</p>}
        </div>
      )}

      <div className="duel-actions">
        {duel.actions.map((a) => (
          <button
            key={a.id}
            className={`duel-action${a.available ? '' : ' unavailable'}`}
            disabled={busy || !a.available}
            onClick={() => onAct(a.id)}
          >
            <strong>
              {ACTION_ICONS[a.id]} {a.name}
            </strong>
            <small>{a.available ? a.description : (a.reason ?? '지금은 쓸 수 없어요')}</small>
          </button>
        ))}
      </div>

      <div className="battle-log" ref={logRef}>
        {log.length === 0 && <p className="empty">행동을 고르면 전투가 시작돼요.</p>}
        {log.map((turn, i) => (
          <Fragment key={i}>
            <div className={`battle-log-row ${turn.attacker}`}>
              <span>
                {turn.turn}턴 · {turn.attacker === 'me' ? (turn.damage === 0 ? '내 행동' : '내 공격') : enemyAttackLabel}
              </span>
              <span>{turn.attacker === 'me' && turn.damage === 0 ? '—' : `-${formatNumber(turn.damage)}`}</span>
              <span>남은 HP {formatNumber(turn.remainingHp)}</span>
            </div>
            {turn.note && <div className="battle-log-note">{turn.note}</div>}
          </Fragment>
        ))}
      </div>

      {onForfeit && (
        <button className="button secondary full" disabled={busy} onClick={onForfeit}>
          {forfeitLabel ?? '포기하기 (패배로 처리돼요)'}
        </button>
      )}
    </section>
  );
}
