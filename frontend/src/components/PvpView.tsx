import { useEffect, useState } from 'react';
import type {
  ActionResult,
  GameState,
  PvpBattleResponse,
  PvpOpponent,
  PvpOpponentResult,
  Species,
} from '../api/types';
import {
  PVP_EQUIPMENT_EFFECT_RATE,
  PVP_RATING_LOSE_DELTA,
  PVP_RATING_WIN_DELTA,
  PVP_REMATCH_COOLDOWN_MINUTES,
  PVP_REMATCH_KEY_PREFIX,
  PVP_WIN_COIN_REWARD,
  PVP_WIN_DIAMOND_CHANCE,
  formatBonusPercent,
  formatNumber,
  getTotalPopulationBySpecies,
  hasBonuses,
  scaleBonuses,
  type StatBonuses,
} from '../utils/gameCalc';
import { hpAfter, useBattleReplay } from '../hooks/useBattleReplay';
import { FighterCard } from './FighterCard';
import { SpeciesImage } from './SpeciesImage';
import { SpeciesPickGrid } from './SpeciesPickGrid';

export function PvpView({
  gameState,
  species,
  equipmentBonuses,
  onSetDefense,
  onFindOpponent,
  onPvpBattle,
}: {
  gameState: GameState;
  species: Species[];
  equipmentBonuses: StatBonuses;
  onSetDefense: (speciesId: string) => Promise<ActionResult | null>;
  onFindOpponent: () => Promise<PvpOpponentResult | null>;
  onPvpBattle: (speciesId: string, opponentUserId: string) => Promise<PvpBattleResponse | null>;
}) {
  const [selected, setSelected] = useState('');
  const [opponent, setOpponent] = useState<PvpOpponent | null>(null);
  const [findingOpponent, setFindingOpponent] = useState(false);
  const [settingDefense, setSettingDefense] = useState(false);
  const [fighting, setFighting] = useState(false);
  const [result, setResult] = useState<PvpBattleResponse | null>(null);
  const [now, setNow] = useState(0);
  const { visibleTurns, setVisibleTurns, animating, logRef } = useBattleReplay(result?.log);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const totals = getTotalPopulationBySpecies(gameState);
  const owned = species.filter((sp) => (totals[sp.speciesId] || 0) > 0);
  const cooldownRemaining = now
    ? Math.max(0, Math.ceil(((gameState.cooldowns.pvp || 0) - now) / 1000))
    : 0;
  // 방금 이긴 상대에게는 한동안 다시 도전할 수 없다(서버에서도 막는다). 같은 상대가 다시 매칭돼도 찾기는 되고 도전만 막힌다.
  const rematchRemaining =
    now && opponent
      ? Math.max(0, Math.ceil(((gameState.cooldowns[PVP_REMATCH_KEY_PREFIX + opponent.userId] || 0) - now) / 1000))
      : 0;
  // 투기장에서는 장비 효과를 PVP_EQUIPMENT_EFFECT_RATE만큼만 반영한다(서버와 같은 값).
  const pvpBonuses = scaleBonuses(equipmentBonuses, PVP_EQUIPMENT_EFFECT_RATE);
  const opponentPreviewStats = opponent ? opponent.stats : null;

  const setDefense = async (speciesId: string) => {
    if (settingDefense) return;
    setSettingDefense(true);
    await onSetDefense(speciesId);
    setSettingDefense(false);
  };

  const findOpponent = async () => {
    if (findingOpponent || animating) return;
    setFindingOpponent(true);
    const r = await onFindOpponent();
    if (r) setOpponent(r.opponent);
    setFindingOpponent(false);
  };

  const fight = async () => {
    if (!selected || !opponent || fighting || animating || cooldownRemaining > 0 || rematchRemaining > 0) return;
    setFighting(true);
    const r = await onPvpBattle(selected, opponent.userId);
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
          <p className="eyebrow">PVP ARENA</p>
          <h1>
            투기장{' '}
            <span>
              {formatNumber(gameState.pvpRating)}점 · {gameState.stats.pvpWins}승 {gameState.stats.pvpLosses}패
              {(gameState.stats.pvpWinStreak ?? 0) > 0 && ` · 🔥 ${gameState.stats.pvpWinStreak}연승`}
            </span>
          </h1>
          <p className="subheading">
            다른 숲지기가 지정해 둔 방어 식구와 대결해요. 내가 이겨도 상대의 자원은 전혀 줄지 않아요.
          </p>
        </div>
      </div>

      <p className="nav-caption">내 방어 식구 설정</p>
      <div className="info-banner">
        🛡️ 여기서 고른 식구가 다른 유저의 투기장 상대로 나가요. 지정하지 않으면 매칭 대상이 되지 않아요(공격하는 건 언제든 가능해요).
      </div>
      {owned.length === 0 ? (
        <p className="empty">방어 식구로 지정할 식구가 아직 없어요.</p>
      ) : (
        <SpeciesPickGrid
          species={owned}
          gameState={gameState}
          activeId={gameState.pvpDefenseSpeciesId ?? ''}
          disabled={settingDefense}
          bonuses={pvpBonuses}
          onPick={setDefense}
        />
      )}

      <p className="nav-caption">상대 찾기</p>
      {!opponent ? (
        <button className="button primary full" onClick={findOpponent} disabled={findingOpponent}>
          {findingOpponent ? '상대를 찾는 중...' : '🔍 상대 찾기'}
        </button>
      ) : (
        <section className="panel pvp-opponent-card">
          <div className="pvp-opponent-header">
            {opponent.avatarUrl ? (
              <img src={opponent.avatarUrl} className="ranking-avatar" alt="" />
            ) : (
              <span className="ranking-avatar ranking-avatar-fallback">
                {opponent.displayName.slice(0, 1)}
              </span>
            )}
            <div>
              <strong>{opponent.displayName}</strong>
              <small>레이팅 {formatNumber(opponent.pvpRating)}점</small>
            </div>
          </div>
          <div className="pvp-opponent-species">
            <SpeciesImage species={opponent.species} style={{ filter: opponent.species.filter }} />
            <div>
              <span>
                {opponent.species.name} · Lv.{opponent.level}
              </span>
              {opponentPreviewStats && (
                <small>
                  ❤️{opponentPreviewStats.hp} ⚔️{opponentPreviewStats.atk} 🛡️{opponentPreviewStats.def}
                </small>
              )}
            </div>
          </div>
          <button
            className="button secondary full"
            onClick={findOpponent}
            disabled={findingOpponent || animating}
          >
            {findingOpponent ? '찾는 중...' : '🔄 다른 상대 찾기'}
          </button>
        </section>
      )}

      <p className="nav-caption">내 공격 식구 선택</p>
      {owned.length === 0 ? (
        <p className="empty">아직 전투에 내보낼 식구가 없어요.</p>
      ) : (
        <SpeciesPickGrid
          species={owned}
          gameState={gameState}
          activeId={selected}
          disabled={animating || fighting}
          bonuses={pvpBonuses}
          onPick={setSelected}
        />
      )}

      {hasBonuses(pvpBonuses) && (
        <div className="info-banner">
          🎒 장착 장비 — 공격력 {formatBonusPercent(pvpBonuses.atk)} · 방어력 {formatBonusPercent(pvpBonuses.def)} · HP{' '}
          {formatBonusPercent(pvpBonuses.hp)}. 상대의 장비도 같은 방식으로 적용돼요(미리보기 스탯에 반영됨).
        </div>
      )}
      <div className="info-banner">
        🆚 승리 시 레이팅 +{PVP_RATING_WIN_DELTA}점 · +{formatNumber(PVP_WIN_COIN_REWARD)} G · 💎{' '}
        {Math.round(PVP_WIN_DIAMOND_CHANCE * 100)}% 확률. 패배 시 레이팅 -{PVP_RATING_LOSE_DELTA}점만
        깎여요(다른 손실 없음). 이긴 상대에게는 {PVP_REMATCH_COOLDOWN_MINUTES}분 동안 다시 도전할 수 없어요.
      </div>

      <button
        className="button primary full battle-fight-button"
        disabled={!selected || !opponent || fighting || animating || cooldownRemaining > 0 || rematchRemaining > 0}
        onClick={fight}
      >
        {rematchRemaining > 0
          ? `🔒 방금 이긴 상대예요 · ${Math.floor(rematchRemaining / 60)}분 ${rematchRemaining % 60}초 뒤에 다시 도전할 수 있어요`
          : cooldownRemaining > 0
          ? `${cooldownRemaining}초 후 다시 도전할 수 있어요`
          : !opponent
            ? '상대를 먼저 찾아주세요'
            : !selected
              ? '내보낼 식구를 먼저 골라주세요'
              : fighting
                ? '대결 신청 중...'
                : animating
                  ? '전투가 진행 중이에요...'
                  : `⚔️ ${opponent.displayName}님에게 도전`}
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
              label={`${result.enemy.ownerName ?? '상대'}님의 식구`}
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
              <p className="battle-reward">
                레이팅 {result.ratingDelta >= 0 ? '+' : ''}
                {result.ratingDelta}점 (현재 {formatNumber(result.rating)}점)
                {result.result === 'win' && (
                  <>
                    {' · '}+{formatNumber(result.reward.coins)} G
                    {result.reward.diamonds ? ` · 💎 ${result.reward.diamonds}개` : ''}
                  </>
                )}
              </p>
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
