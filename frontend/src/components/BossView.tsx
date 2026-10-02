import { Fragment, useEffect, useState } from 'react';
import type { BossBattleResponse, BossCatalog, EquipmentCatalogItem, GameState, Species } from '../api/types';
import {
  BOSS_DAILY_ATTEMPTS,
  RARITIES,
  formatBonusPercent,
  formatNumber,
  getBossAttemptsLeft,
  getTotalPopulationBySpecies,
  hasBonuses,
  type StatBonuses,
} from '../utils/gameCalc';
import { hpAfter, useBattleReplay } from '../hooks/useBattleReplay';
import { FighterCard } from './FighterCard';
import { SpeciesImage } from './SpeciesImage';
import { SpeciesPickGrid } from './SpeciesPickGrid';

export function BossView({
  gameState,
  species,
  catalog,
  equipmentCatalog,
  equipmentBonuses,
  onBattle,
}: {
  gameState: GameState;
  species: Species[];
  catalog: BossCatalog | null;
  equipmentCatalog: EquipmentCatalogItem[];
  equipmentBonuses: StatBonuses;
  onBattle: (speciesId: string, floor: number) => Promise<BossBattleResponse | null>;
}) {
  const [selected, setSelected] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [fighting, setFighting] = useState(false);
  const [result, setResult] = useState<BossBattleResponse | null>(null);
  const [now, setNow] = useState(0);
  const { visibleTurns, setVisibleTurns, animating, logRef } = useBattleReplay(result?.log);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const floors = catalog?.floors ?? [];
  const highest = gameState.stats.highestBossFloor ?? 0;
  const nextFloor = Math.min(highest + 1, floors.length);
  // 직접 고르지 않았다면 항상 "다음에 깰 층"을 가리킨다(첫 클리어하면 자동으로 다음 층으로 넘어간다).
  const floorNo = picked ?? nextFloor;
  const info = floors.find((f) => f.floor === floorNo) ?? null;
  const attemptsLeft = getBossAttemptsLeft(gameState);
  const cooldownRemaining = now
    ? Math.max(0, Math.ceil(((gameState.cooldowns.boss || 0) - now) / 1000))
    : 0;

  const totals = getTotalPopulationBySpecies(gameState);
  const owned = species.filter((sp) => (totals[sp.speciesId] || 0) > 0);
  const cleared = !!info && info.floor <= highest;
  const equipmentIcon = (itemId: string) =>
    equipmentCatalog.find((e) => e.equipmentId === itemId)?.icon ?? '🎒';

  const fight = async () => {
    if (!selected || !info || fighting || animating || cooldownRemaining > 0 || attemptsLeft <= 0) return;
    setFighting(true);
    const r = await onBattle(selected, info.floor);
    if (r) {
      setResult(r);
      setVisibleTurns(0);
      if (r.firstClear) setPicked(null);
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
          <p className="eyebrow">BOSS TOWER</p>
          <h1>
            보스 타워{' '}
            <span>
              최고 {highest}층 · 오늘 남은 도전 {attemptsLeft}/{BOSS_DAILY_ATTEMPTS}
            </span>
          </h1>
          <p className="subheading">5층마다 패턴을 가진 보스가 기다리고 있어요. 장비와 전투 레벨을 키워 올라가 보세요.</p>
        </div>
      </div>

      <div className="info-banner">
        👹 도전은 승패와 상관없이 하루 {BOSS_DAILY_ATTEMPTS}회예요. 깬 층의 바로 다음 층까지만 열리고, 처음 깰 때는 보상이 커요.
        이미 깬 층은 다시 도전해 골드(보스 층은 장비 복사본 확률)를 받을 수 있어요.
      </div>

      <p className="nav-caption">층 선택</p>
      {!catalog ? (
        <p className="empty">타워 정보를 불러오는 중이에요...</p>
      ) : (
        <div className="boss-floor-grid">
          {floors.map((f) => {
            const locked = f.floor > highest + 1;
            const classes = [
              'boss-floor',
              f.isBoss ? 'boss' : '',
              f.floor <= highest ? 'cleared' : '',
              f.floor === highest + 1 ? 'current' : '',
              f.floor === floorNo ? 'selected' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={f.floor}
                className={classes}
                disabled={locked || animating || fighting}
                onClick={() => setPicked(f.floor === nextFloor ? null : f.floor)}
                title={`${f.floor}층${f.isBoss ? ' 보스' : ''}`}
              >
                <strong>{f.floor}</strong>
                <small>{f.isBoss ? '👹' : f.floor <= highest ? '✓' : locked ? '🔒' : '·'}</small>
              </button>
            );
          })}
        </div>
      )}

      {info && info.species && (
        <section className="panel boss-floor-card">
          <div className="pvp-opponent-species">
            <SpeciesImage species={info.species} style={{ filter: info.species.filter }} />
            <div>
              <span>
                {info.floor}층 {info.isBoss ? '👹 보스 · ' : ''}
                {info.species.name}{' '}
                <span className="pill" style={{ color: RARITIES[info.species.rarity].color }}>
                  {RARITIES[info.species.rarity].name}
                </span>
              </span>
              <small>
                ❤️{info.stats.hp} ⚔️{info.stats.atk} 🛡️{info.stats.def} (전투마다 ±15% 편차)
              </small>
            </div>
          </div>
          {info.patterns.length > 0 && (
            <ul className="boss-patterns">
              {info.patterns.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong> {p.description}
                </li>
              ))}
            </ul>
          )}
          <p className="boss-rewards">
            {cleared ? (
              <>
                ✓ 이미 깬 층 · 다시 이기면 +{formatNumber(info.rewards.repeatCoins)} G
                {info.rewards.firstEquipmentRarity !== null && (
                  <>
                    {' · '}
                    {Math.round(info.rewards.repeatCopyChance * 100)}% 확률로{' '}
                    {RARITIES[info.rewards.firstEquipmentRarity].name} 장비 복사본
                  </>
                )}
              </>
            ) : (
              <>
                🎁 첫 클리어 보상 +{formatNumber(info.rewards.firstCoins)} G
                {info.rewards.firstDiamonds > 0 && ` · 💎 ${info.rewards.firstDiamonds}개`}
                {info.rewards.firstEquipmentRarity !== null &&
                  ` · ${RARITIES[info.rewards.firstEquipmentRarity].name} 장비 1개`}
              </>
            )}
          </p>
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
          bonuses={equipmentBonuses}
          onPick={setSelected}
        />
      )}

      {hasBonuses(equipmentBonuses) && (
        <div className="info-banner">
          🎒 장착 장비 — 공격력 {formatBonusPercent(equipmentBonuses.atk)} · 방어력{' '}
          {formatBonusPercent(equipmentBonuses.def)} · HP {formatBonusPercent(equipmentBonuses.hp)}가 적용돼요(위 스탯에
          반영됨).
        </div>
      )}

      <button
        className="button primary full battle-fight-button"
        disabled={!selected || !info || fighting || animating || cooldownRemaining > 0 || attemptsLeft <= 0}
        onClick={fight}
      >
        {attemptsLeft <= 0
          ? '오늘 도전 횟수를 모두 썼어요 (내일 다시)'
          : cooldownRemaining > 0
            ? `${cooldownRemaining}초 후 다시 도전할 수 있어요`
            : !info
              ? '층을 불러오는 중이에요'
              : !selected
                ? '내보낼 식구를 먼저 골라주세요'
                : fighting
                  ? '도전 중...'
                  : animating
                    ? '전투가 진행 중이에요...'
                    : `⚔️ ${info.floor}층${info.isBoss ? ' 보스' : ''}에 도전`}
      </button>

      {result && (
        <section className="panel battle-result">
          <div className={`battle-banner ${animating ? 'ongoing' : result.result}`}>
            {animating
              ? '⚔️ 전투 중...'
              : result.result === 'win'
                ? result.firstClear
                  ? `🎉 ${result.floor}층 첫 클리어!`
                  : '🎉 승리!'
                : '💧 패배...'}
          </div>
          <div className="battle-vs">
            <FighterCard fighter={result.mine} label="내 식구" hp={myHp} acting={lastTurn?.attacker === 'me'} />
            <span className="battle-vs-mark">VS</span>
            <FighterCard
              fighter={{ ...result.enemy, levelLabel: `${result.floor}층` }}
              label={result.isBoss ? '👹 보스' : '수문장'}
              hp={enemyHp}
              acting={lastTurn?.attacker === 'enemy'}
            />
          </div>
          <div className="battle-log" ref={logRef}>
            {visibleLog.map((turn, i) => (
              <Fragment key={i}>
                <div className={`battle-log-row ${turn.attacker}`}>
                  <span>{turn.attacker === 'me' ? '내 공격' : result.isBoss ? '보스 공격' : '상대 공격'}</span>
                  <span>-{formatNumber(turn.damage)}</span>
                  <span>남은 HP {formatNumber(turn.remainingHp)}</span>
                </div>
                {turn.note && <div className="battle-log-note">{turn.note}</div>}
              </Fragment>
            ))}
          </div>
          {animating ? (
            <button className="button secondary full" onClick={() => setVisibleTurns(result.log.length)}>
              ⏭ 결과 바로 보기
            </button>
          ) : (
            <>
              <p className="battle-reward">
                {result.result === 'win' ? (
                  <>
                    +{formatNumber(result.reward.coins)} G
                    {result.reward.diamonds ? ` · 💎 ${result.reward.diamonds}개` : ''}
                    {result.reward.equipment && (
                      <>
                        {' · '}
                        {equipmentIcon(result.reward.equipment.itemId)} {result.reward.equipment.name}
                        {result.reward.equipment.isNew ? ' (새 장비!)' : ` 복사본 +1 (보유 ${result.reward.equipment.copies}개)`}
                      </>
                    )}
                  </>
                ) : (
                  '다음 도전을 준비해 보세요'
                )}
                {' · '}오늘 남은 도전 {result.attemptsLeft}회
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
