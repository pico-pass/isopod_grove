import { useEffect, useRef, useState } from 'react';
import type { BattleResponse, BattleTurn, GameState, Species } from '../api/types';
import {
  BATTLE_DIAMOND_CHANCE_BY_RARITY,
  BATTLE_REWARD_BY_RARITY,
  RARITIES,
  formatNumber,
  getBattleLevelProgress,
  getCombatBaseStats,
  getTotalPopulationBySpecies,
} from '../utils/gameCalc';
import { SpeciesImage } from './SpeciesImage';

const TURN_DELAY_MS = 550;

// 지금까지 공개된 턴만 보고 특정 쪽의 "현재" HP를 계산한다.
// 내 HP는 상대가 공격한 턴(attacker: 'enemy')의 결과에서, 상대 HP는 내가 공격한 턴에서 나온다.
function hpAfter(log: BattleTurn[], visibleCount: number, side: 'me' | 'enemy', startHp: number): number {
  const damagedBy: 'me' | 'enemy' = side === 'me' ? 'enemy' : 'me';
  for (let i = Math.min(visibleCount, log.length) - 1; i >= 0; i--) {
    if (log[i].attacker === damagedBy) return log[i].remainingHp;
  }
  return startHp;
}

function FighterCard({
  fighter,
  label,
  hp,
  acting,
}: {
  fighter: BattleResponse['mine'];
  label: string;
  hp: number;
  acting: boolean;
}) {
  const maxHp = fighter.stats.hp;
  return (
    <div className={`fighter-card${acting ? ' acting' : ''}`}>
      <span className="pill" style={{ color: RARITIES[fighter.rarity].color }}>
        {RARITIES[fighter.rarity].name} · Lv.{fighter.level}
      </span>
      <SpeciesImage species={fighter} style={{ filter: fighter.filter }} />
      <h3>{fighter.name}</h3>
      <small>{label}</small>
      <div className="hp-bar">
        <i style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }} />
      </div>
      <small>
        ❤️ {Math.max(0, hp)} / {maxHp}
      </small>
      <div className="fighter-stats">
        <span>⚔️ {fighter.stats.atk}</span>
        <span>🛡️ {fighter.stats.def}</span>
      </div>
    </div>
  );
}

export function BattleView({
  gameState,
  species,
  onBattle,
}: {
  gameState: GameState;
  species: Species[];
  onBattle: (speciesId: string, difficulty: number) => Promise<BattleResponse | null>;
}) {
  const [difficulty, setDifficulty] = useState(0);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<BattleResponse | null>(null);
  const [fighting, setFighting] = useState(false);
  const [visibleTurns, setVisibleTurns] = useState(0);
  const [now, setNow] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 전투 중엔 아직 공개 안 된 턴이 남아 있다는 뜻 — 이 값 자체가 "재생 중"인지를 알려준다.
  const animating = !!result && visibleTurns < result.log.length;

  // 턴을 하나씩 공개하는 타이머. 공개된 턴 수가 바뀔 때마다 다음 타이머를 다시 건다.
  useEffect(() => {
    if (!animating) return;
    const timer = setTimeout(() => setVisibleTurns((n) => n + 1), TURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [animating, visibleTurns]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleTurns]);

  const totals = getTotalPopulationBySpecies(gameState);
  const owned = species.filter((sp) => (totals[sp.speciesId] || 0) > 0);
  const cooldownRemaining = now
    ? Math.max(0, Math.ceil(((gameState.cooldowns.battle || 0) - now) / 1000))
    : 0;

  const fight = async () => {
    if (!selected || fighting || animating || cooldownRemaining > 0) return;
    setFighting(true);
    const r = await onBattle(selected, difficulty);
    if (r) {
      setResult(r);
      setVisibleTurns(0); // 새 전투 결과가 와도 바로 다 보여주지 않고 처음부터 재생한다
    }
    setFighting(false);
  };

  const visibleLog = result ? result.log.slice(0, visibleTurns) : [];
  const lastTurn = visibleLog[visibleLog.length - 1];
  const myHp = result ? hpAfter(result.log, visibleTurns, 'me', result.mine.stats.hp) : 0;
  const enemyHp = result ? hpAfter(result.log, visibleTurns, 'enemy', result.enemy.stats.hp) : 0;

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WILD BATTLE ARENA</p>
          <h1>
            야생 배틀{' '}
            <span>
              {gameState.stats.battlesWon}승 {gameState.stats.battlesLost}패
            </span>
          </h1>
          <p className="subheading">
            보유한 식구 한 마리를 내보내 야생 개체와 겨뤄요. 져도 식구는 그대로 남아요.
          </p>
        </div>
      </div>

      <p className="nav-caption">난이도 선택</p>
      <div className="difficulty-row">
        {RARITIES.map((r, i) => (
          <button
            key={r.name}
            className={`difficulty-pick${difficulty === i ? ' active' : ''}`}
            style={{ color: r.color, borderColor: difficulty === i ? r.color : undefined }}
            onClick={() => setDifficulty(i)}
            disabled={animating || fighting}
          >
            <strong>{r.name}</strong>
            <small>
              +{formatNumber(BATTLE_REWARD_BY_RARITY[i])} G · 💎{Math.round(BATTLE_DIAMOND_CHANCE_BY_RARITY[i] * 100)}%
            </small>
          </button>
        ))}
      </div>

      <div className="info-banner">
        ⚔️ 고른 난이도 등급의 야생 개체와 붙어요. 난이도가 높을수록 상대가 강하지만 이기면 보상도 커요.
      </div>

      {owned.length === 0 ? (
        <p className="empty">아직 전투에 내보낼 식구가 없어요. 먼저 탐색으로 식구를 만나보세요.</p>
      ) : (
        <div className="battle-picker">
          {owned.map((sp) => {
            const progress = getBattleLevelProgress(gameState.battleXp[sp.speciesId] || 0);
            const stats = getCombatBaseStats(sp.rarity, progress.level);
            return (
              <button
                key={sp.speciesId}
                className={`battle-pick${selected === sp.speciesId ? ' active' : ''}`}
                onClick={() => setSelected(sp.speciesId)}
                disabled={animating || fighting}
              >
                <SpeciesImage species={sp} style={{ filter: sp.filter }} />
                <span className="battle-pick-name">
                  {sp.name} <small className="battle-pick-level">Lv.{progress.level}</small>
                </span>
                <div className="mini-xp-bar">
                  <i style={{ width: `${(progress.currentXp / progress.requiredXp) * 100}%` }} />
                </div>
                <small>
                  ❤️{stats.hp} ⚔️{stats.atk} 🛡️{stats.def}
                </small>
              </button>
            );
          })}
        </div>
      )}

      <button
        className="button primary full battle-fight-button"
        disabled={!selected || fighting || animating || cooldownRemaining > 0}
        onClick={fight}
      >
        {cooldownRemaining > 0
          ? `${cooldownRemaining}초 후 다시 도전할 수 있어요`
          : fighting
            ? '야생 개체를 찾는 중...'
            : animating
              ? '전투가 진행 중이에요...'
              : `⚔️ ${RARITIES[difficulty].name} 난이도로 전투 시작`}
      </button>

      {result && (
        <section className="panel battle-result">
          <div className={`battle-banner ${animating ? 'ongoing' : result.result}`}>
            {animating ? '⚔️ 전투 중...' : result.result === 'win' ? '🎉 승리!' : '💧 패배...'}
          </div>
          <div className="battle-vs">
            <FighterCard fighter={result.mine} label="내 식구" hp={myHp} acting={lastTurn?.attacker === 'me'} />
            <span className="battle-vs-mark">VS</span>
            <FighterCard
              fighter={result.enemy}
              label="야생 개체"
              hp={enemyHp}
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
            <button className="button secondary full" onClick={() => setVisibleTurns(result.log.length)}>
              ⏭ 결과 바로 보기
            </button>
          ) : (
            <>
              {result.result === 'win' && (
                <p className="battle-reward">
                  보상: +{formatNumber(result.reward.coins)} G
                  {result.reward.diamonds ? ` · 💎 ${result.reward.diamonds}개` : ''}
                </p>
              )}
              <p className="battle-species-xp">
                {result.mine.name} 전투 경험치 +{result.speciesLevel.xpGained}
                {result.speciesLevel.leveledUp && (
                  <span className="level-up-badge"> 🆙 Lv.{result.speciesLevel.level} 달성!</span>
                )}
              </p>
              <div className="mini-xp-bar large">
                <i
                  style={{
                    width: `${(result.speciesLevel.currentXp / result.speciesLevel.requiredXp) * 100}%`,
                  }}
                />
              </div>
            </>
          )}
        </section>
      )}
    </section>
  );
}
