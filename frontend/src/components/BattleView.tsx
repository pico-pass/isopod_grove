import { useEffect, useState } from 'react';
import type { BattleResponse, GameState, Species, TrainResponse } from '../api/types';
import {
  BATTLE_DIAMOND_CHANCE_BY_RARITY,
  BATTLE_REWARD_BY_RARITY,
  RARITIES,
  TRAIN_COOLDOWN_SECONDS_BY_INTENSITY,
  TRAIN_EXTREME_DIAMOND_COST,
  TRAIN_EXTREME_XP_MULTIPLIER,
  TRAIN_INTENSITY_LABELS,
  TRAIN_XP_BY_INTENSITY,
  formatDuration,
  formatNumber,
  getBattleLevelProgress,
  getCombatBaseStats,
  getTotalPopulationBySpecies,
  getTrainCost,
} from '../utils/gameCalc';
import { hpAfter, useBattleReplay } from '../hooks/useBattleReplay';
import { FighterCard } from './FighterCard';
import { SpeciesImage } from './SpeciesImage';

type Mode = 'wild' | 'train';

export function BattleView({
  gameState,
  species,
  onBattle,
  onTrain,
}: {
  gameState: GameState;
  species: Species[];
  onBattle: (speciesId: string, difficulty: number) => Promise<BattleResponse | null>;
  onTrain: (speciesId: string, intensity: number, extreme: boolean) => Promise<TrainResponse | null>;
}) {
  const [mode, setMode] = useState<Mode>('wild');
  const [difficulty, setDifficulty] = useState(0);
  const [intensity, setIntensity] = useState(0);
  const [extreme, setExtreme] = useState(false);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<BattleResponse | null>(null);
  const [trainResult, setTrainResult] = useState<TrainResponse | null>(null);
  const [fighting, setFighting] = useState(false);
  const [training, setTraining] = useState(false);
  const [now, setNow] = useState(0);
  const { visibleTurns, setVisibleTurns, animating, logRef } = useBattleReplay(result?.log);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const totals = getTotalPopulationBySpecies(gameState);
  const owned = species.filter((sp) => (totals[sp.speciesId] || 0) > 0);
  const cooldownRemaining = now
    ? Math.max(0, Math.ceil(((gameState.cooldowns.battle || 0) - now) / 1000))
    : 0;
  const trainCooldownRemaining = now
    ? Math.max(0, Math.ceil(((gameState.cooldowns.train || 0) - now) / 1000))
    : 0;

  const selectedSpecies = owned.find((sp) => sp.speciesId === selected) ?? null;
  const selectedProgress = selectedSpecies
    ? getBattleLevelProgress(gameState.battleXp[selectedSpecies.speciesId] || 0)
    : null;
  const trainCost =
    selectedSpecies && selectedProgress
      ? getTrainCost(selectedSpecies.rarity, selectedProgress.level, intensity)
      : null;
  const trainDiamondCost = extreme ? TRAIN_EXTREME_DIAMOND_COST : 0;
  const canAffordTrain =
    trainCost !== null && gameState.coins >= trainCost && gameState.diamonds >= trainDiamondCost;

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

  const train = async () => {
    if (!selected || training || trainCooldownRemaining > 0 || !canAffordTrain) return;
    setTraining(true);
    const r = await onTrain(selected, intensity, extreme);
    if (r) setTrainResult(r);
    setTraining(false);
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
            보유한 식구 한 마리를 내보내 야생 개체와 겨루거나, 코인을 내고 바로 훈련시켜 보세요.
          </p>
        </div>
      </div>

      <div className="filter-row">
        <button className={`filter${mode === 'wild' ? ' active' : ''}`} onClick={() => setMode('wild')}>
          ⚔️ 야생 배틀
        </button>
        <button className={`filter${mode === 'train' ? ' active' : ''}`} onClick={() => setMode('train')}>
          🏋️ 전투 훈련
        </button>
      </div>

      {mode === 'wild' ? (
        <>
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
        </>
      ) : (
        <>
          <p className="nav-caption">훈련 강도 선택</p>
          <div className="difficulty-row">
            {TRAIN_INTENSITY_LABELS.map((label, i) => (
              <button
                key={label}
                className={`difficulty-pick${intensity === i ? ' active' : ''}`}
                onClick={() => setIntensity(i)}
                disabled={training}
              >
                <strong>{label}</strong>
                <small>
                  경험치 +{TRAIN_XP_BY_INTENSITY[i] * (extreme ? TRAIN_EXTREME_XP_MULTIPLIER : 1)}
                  {selectedSpecies && selectedProgress
                    ? ` · ${formatNumber(getTrainCost(selectedSpecies.rarity, selectedProgress.level, i))} G`
                    : ''}
                  {extreme ? ` · 💎${TRAIN_EXTREME_DIAMOND_COST}` : ''}
                </small>
                <small>⏱ 쿨다운 {formatDuration(TRAIN_COOLDOWN_SECONDS_BY_INTENSITY[i])}</small>
              </button>
            ))}
          </div>
          <button
            className={`extreme-toggle${extreme ? ' active' : ''}`}
            onClick={() => setExtreme((v) => !v)}
            disabled={training}
          >
            ☢️ 극한 훈련 {extreme ? 'ON' : 'OFF'}
            <small>다이아 {TRAIN_EXTREME_DIAMOND_COST}개 추가 소모 · 경험치 {TRAIN_EXTREME_XP_MULTIPLIER}배</small>
          </button>
          <div className="info-banner">
            🏋️ 상대도 승패도 없이, 코인을 내고 바로 전투 경험치를 얻어요. 레벨이 높을수록, 강도가 높을수록 비용과 쿨다운이 올라가요.
            {extreme && ' 극한 훈련 중엔 회당 💎가 추가로 들어요.'}
          </div>
        </>
      )}

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
                disabled={animating || fighting || training}
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

      {mode === 'wild' ? (
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
      ) : (
        <button
          className="button primary full battle-fight-button"
          disabled={!selected || training || trainCooldownRemaining > 0 || !canAffordTrain}
          onClick={train}
        >
          {!selected
            ? '훈련시킬 식구를 먼저 골라주세요'
            : trainCooldownRemaining > 0
              ? `${trainCooldownRemaining}초 후 다시 훈련할 수 있어요`
              : training
                ? '훈련 중...'
                : !canAffordTrain
                  ? trainCost !== null && gameState.coins < trainCost
                    ? `G가 부족해요 (${formatNumber(trainCost ?? 0)} G 필요)`
                    : `💎가 부족해요 (${trainDiamondCost}개 필요)`
                  : `${extreme ? '☢️ 극한 ' : '🏋️ '}${TRAIN_INTENSITY_LABELS[intensity]} 시작 (-${formatNumber(trainCost ?? 0)} G${trainDiamondCost ? ` · 💎${trainDiamondCost}` : ''})`}
        </button>
      )}

      {mode === 'wild' && result && (
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

      {mode === 'train' && trainResult && (
        <section className="panel battle-result">
          <div className="battle-banner win">
            {trainResult.diamondCost ? '☢️ 극한 훈련 완료!' : '🏋️ 훈련 완료!'}
          </div>
          <p className="battle-reward">
            -{formatNumber(trainResult.cost)} G
            {trainResult.diamondCost ? ` · 💎 ${trainResult.diamondCost}개` : ''}
          </p>
          <p className="battle-species-xp">
            전투 경험치 +{trainResult.speciesLevel.xpGained}
            {trainResult.speciesLevel.leveledUp && (
              <span className="level-up-badge"> 🆙 Lv.{trainResult.speciesLevel.level} 달성!</span>
            )}
          </p>
          <div className="mini-xp-bar large">
            <i
              style={{
                width: `${(trainResult.speciesLevel.currentXp / trainResult.speciesLevel.requiredXp) * 100}%`,
              }}
            />
          </div>
        </section>
      )}
    </section>
  );
}
