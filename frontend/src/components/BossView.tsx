import { Fragment, useEffect, useState } from 'react';
import { api } from '../api/client';
import type {
  BossBattleResponse,
  BossCatalog,
  BossDifficultyId,
  BossDuelActResponse,
  BossDuelEndResponse,
  BossDuelTurnResponse,
  BossDuelView,
  BuyAttemptResponse,
  DuelActionId,
  EquipmentCatalogItem,
  GameState,
  SkipCooldownResponse,
  Species,
} from '../api/types';
import {
  BOSS_COOLDOWN_MINUTES,
  BOSS_DAILY_ATTEMPTS,
  RARITIES,
  formatBonusPercent,
  formatDuration,
  formatNumber,
  getBossAttemptLimit,
  getBossAttemptsLeft,
  getBossCooldownSkipCost,
  getBossProgress,
  getTotalPopulationBySpecies,
  hasBonuses,
  scaleBossStats,
  type StatBonuses,
} from '../utils/gameCalc';
import { hpAfter, useBattleReplay } from '../hooks/useBattleReplay';
import { BattleRulesBanner } from './BattleRulesBanner';
import { FamilyBadge } from './FamilyBadge';
import { FighterCard } from './FighterCard';
import { DuelPanel } from './DuelPanel';
import { SpeciesImage } from './SpeciesImage';
import { SpeciesPickGrid } from './SpeciesPickGrid';

const DIFFICULTY_STORAGE_KEY = 'isopod-boss-difficulty';
const FALLBACK_DIFFICULTIES: BossCatalog['difficulties'] = [{ id: 'easy', name: '쉬움', multiplier: 1 }];

// 마지막으로 고른 난이도를 기억한다(저장소를 못 쓰는 환경에서는 쉬움으로 시작한다).
function loadDifficulty(): BossDifficultyId {
  try {
    const saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (saved === 'easy' || saved === 'normal' || saved === 'hard' || saved === 'extreme') return saved;
  } catch {
    // 저장소를 못 쓰면 기본값을 쓴다.
  }
  return 'easy';
}

export function BossView({
  gameState,
  species,
  catalog,
  equipmentCatalog,
  equipmentBonuses,
  onBattle,
  onBuyAttempt,
  onSkipCooldown,
  onDuelStart,
  onDuelAct,
  onDuelForfeit,
}: {
  gameState: GameState;
  species: Species[];
  catalog: BossCatalog | null;
  equipmentCatalog: EquipmentCatalogItem[];
  equipmentBonuses: StatBonuses;
  onBattle: (speciesId: string, floor: number, difficulty: BossDifficultyId) => Promise<BossBattleResponse | null>;
  onBuyAttempt: () => Promise<BuyAttemptResponse | null>;
  onSkipCooldown: () => Promise<SkipCooldownResponse | null>;
  onDuelStart: (speciesId: string, floor: number, difficulty: BossDifficultyId) => Promise<BossDuelTurnResponse | null>;
  onDuelAct: (action: DuelActionId) => Promise<BossDuelActResponse | null>;
  onDuelForfeit: () => Promise<BossDuelEndResponse | null>;
}) {
  const [selected, setSelected] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [difficultyId, setDifficultyId] = useState<BossDifficultyId>(loadDifficulty);
  const [fighting, setFighting] = useState(false);
  const [buying, setBuying] = useState(false);
  // 진행 중인 직접 전투(없으면 null). 새로고침하거나 다른 기기에서 들어와도 서버에서 다시 불러와 이어간다.
  const [duel, setDuel] = useState<BossDuelView | null>(null);
  const [duelBusy, setDuelBusy] = useState(false);
  const [result, setResult] = useState<BossBattleResponse | null>(null);
  const [now, setNow] = useState(0);
  const { visibleTurns, setVisibleTurns, animating, logRef } = useBattleReplay(result?.log);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setDuel((await api.getBossDuel()).duel);
      } catch {
        // 진행 중인 전투를 못 불러와도 자동 전투는 할 수 있다.
      }
    });
  }, []);

  const floors = catalog?.floors ?? [];
  const difficulties = catalog?.difficulties ?? FALLBACK_DIFFICULTIES;
  const difficulty = difficulties.find((d) => d.id === difficultyId) ?? difficulties[0];
  const mult = difficulty.multiplier;
  // 깬 층은 난이도마다 따로 센다.
  const highest = getBossProgress(gameState.stats, difficulty.id);
  const nextFloor = Math.min(highest + 1, floors.length);
  // 직접 고르지 않았다면 항상 "다음에 깰 층"을 가리킨다(첫 클리어하면 자동으로 다음 층으로 넘어간다).
  const floorNo = picked ?? nextFloor;
  const info = floors.find((f) => f.floor === floorNo) ?? null;
  const attemptsLeft = getBossAttemptsLeft(gameState);
  const attemptLimit = getBossAttemptLimit(gameState);
  const cooldownRemaining = now
    ? Math.max(0, Math.ceil(((gameState.cooldowns.boss || 0) - now) / 1000))
    : 0;
  // 다이아로 사는 편의 기능: 오늘 도전을 모두 쓰면 추가 도전, 쿨타임 중이면 건너뛰기
  const extraBought = gameState.daily.bossExtraAttempts ?? 0;
  const nextExtraCost = catalog?.extraAttemptCosts[extraBought] ?? null;
  const skipCost =
    catalog && cooldownRemaining > 0 ? getBossCooldownSkipCost(cooldownRemaining, catalog.cooldownSkipSecondsPerDiamond) : 0;

  const totals = getTotalPopulationBySpecies(gameState);
  const owned = species.filter((sp) => (totals[sp.speciesId] || 0) > 0);
  const cleared = !!info && info.floor <= highest;
  const environment = info?.environment ? (catalog?.rules?.environments.find((e) => e.id === info.environment) ?? null) : null;
  const equipmentIcon = (itemId: string) =>
    equipmentCatalog.find((e) => e.equipmentId === itemId)?.icon ?? '🎒';

  const fight = async () => {
    if (!selected || !info || fighting || animating || cooldownRemaining > 0 || attemptsLeft <= 0) return;
    setFighting(true);
    const r = await onBattle(selected, info.floor, difficulty.id);
    if (r) {
      setResult(r);
      setVisibleTurns(0);
      if (r.firstClear) setPicked(null);
    }
    setFighting(false);
  };

  // 전투가 끝나면(승·패·포기) 자동 전투와 같은 결과 화면을 바로 보여준다. 이미 턴마다 봤으니 다시 재생하지 않는다.
  const finishDuel = (r: BossDuelEndResponse) => {
    setDuel(null);
    setResult(r);
    setVisibleTurns(r.log.length);
    setPicked(null);
  };

  const startDuel = async () => {
    if (!selected || !info || fighting || animating || cooldownRemaining > 0 || attemptsLeft <= 0 || duelBusy) return;
    setDuelBusy(true);
    const r = await onDuelStart(selected, info.floor, difficulty.id);
    if (r) {
      setResult(null);
      setDuel(r.duel);
    }
    setDuelBusy(false);
  };

  const duelAct = async (action: DuelActionId) => {
    if (duelBusy) return;
    setDuelBusy(true);
    const r = await onDuelAct(action);
    if (r) {
      if (r.finished) finishDuel(r);
      else setDuel(r.duel);
    }
    setDuelBusy(false);
  };

  const duelForfeit = async () => {
    if (duelBusy) return;
    if (!window.confirm('직접 전투를 포기할까요?\n이미 쓴 도전 횟수는 돌아오지 않고 패배로 처리돼요.')) return;
    setDuelBusy(true);
    const r = await onDuelForfeit();
    if (r) finishDuel(r);
    setDuelBusy(false);
  };

  const buyAttempt = async () => {
    if (buying) return;
    setBuying(true);
    await onBuyAttempt();
    setBuying(false);
  };

  const skipCooldown = async () => {
    if (buying) return;
    setBuying(true);
    await onSkipCooldown();
    setBuying(false);
  };

  const chooseDifficulty = (id: BossDifficultyId) => {
    setDifficultyId(id);
    setPicked(null); // 난이도를 바꾸면 그 난이도에서 다음에 깰 층으로 돌아간다
    try {
      localStorage.setItem(DIFFICULTY_STORAGE_KEY, id);
    } catch {
      // 저장하지 못해도 화면에는 영향이 없다.
    }
  };
  const scaledStats = info ? scaleBossStats(info.stats, mult) : null;
  const best = difficulties
    .map((d) => ({ d, floor: getBossProgress(gameState.stats, d.id) }))
    .filter((x) => x.floor > 0);

  const visibleLog = result ? result.log.slice(0, visibleTurns) : [];
  if (duel) {
    return (
      <section className="view active">
        <div className="page-heading">
          <div>
            <p className="eyebrow">BOSS TOWER</p>
            <h1>
              보스 타워 <span>직접 전투 진행 중 · 오늘 남은 도전 {attemptsLeft}/{attemptLimit}</span>
            </h1>
            <p className="subheading">매 턴 행동을 골라 보스와 싸워요. 보상은 자동 전투와 같아요.</p>
          </div>
        </div>
        <DuelPanel
          duel={duel}
          title={`[${duel.difficulty.name}] ${duel.floor}층${duel.isBoss ? ' 보스' : ''}`}
          enemyLabel={duel.isBoss ? '👹 보스' : '수문장'}
          enemyLevelLabel={`${duel.floor}층 · ${duel.difficulty.name}`}
          enemyAttackLabel={duel.isBoss ? '보스 공격' : '상대 공격'}
          busy={duelBusy}
          onAct={(a) => void duelAct(a)}
          onForfeit={() => void duelForfeit()}
        />
      </section>
    );
  }
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
              {difficulty.name} 최고 {highest}층 · 오늘 남은 도전 {attemptsLeft}/{attemptLimit}
            </span>
          </h1>
          <p className="subheading">5층마다 패턴을 가진 보스가 기다리고 있어요. 장비와 전투 레벨을 키워 올라가 보세요.</p>
        </div>
      </div>

      <div className="info-banner">
        👹 도전은 승패와 상관없이 하루 {BOSS_DAILY_ATTEMPTS}회이고, 전투 사이에는 {BOSS_COOLDOWN_MINUTES}분 쿨타임이 있어요. 깬 층의 바로 다음 층까지만 열리고, 처음 깰 때는 보상이 커요.
        도전을 모두 쓰면 💎로 추가 도전을 살 수 있고(하루 최대 {catalog?.extraAttemptCosts.length ?? 3}회, 살수록 비싸져요), 쿨타임은 💎로 건너뛸 수 있어요.
        이미 깬 층은 다시 도전해 골드(보스 층은 장비 복사본·다이아 확률)를 받을 수 있어요.
        <br />
        🌍 층마다 전투 환경이 정해져 있고(평범한 땅 → 화산 지대 → 울창한 숲 → 서리 평원 순), 환경이 편드는 계열은 공격·방어 +3%예요.
        🔥 불꽃 &gt; 🌿 숲 &gt; ❄️ 서리 &gt; 🔥 불꽃 상성도 있어서 이기는 쪽 +3%, 지는 쪽 −3%예요. 식구를 고를 때 ▲유리/▼불리가 표시돼요.
      </div>

      <p className="nav-caption">난이도</p>
      <div className="boss-difficulty-row">
        {difficulties.map((d) => (
          <button
            key={d.id}
            className={`boss-difficulty${d.id === difficulty.id ? ' active' : ''}`}
            disabled={animating || fighting}
            onClick={() => chooseDifficulty(d.id)}
          >
            <strong>{d.name}</strong>
            <small>×{d.multiplier}</small>
            <small>{getBossProgress(gameState.stats, d.id)}층</small>
          </button>
        ))}
      </div>
      <div className="info-banner">
        🎚️ 난이도 배율만큼 보스의 HP·공격·방어가 세지고, 골드·경험치 보상도 같은 배율로 늘어나요. 깬 층은 난이도마다
        따로 기록돼서(다른 난이도에서 깬 층은 인정되지 않아요) 난이도마다 1층부터 올라가요. 다이아·장비 첫 클리어 보상은
        난이도마다 한 번씩 받아요.
        {best.length > 1 && <> (기록: {best.map((x) => `${x.d.name} ${x.floor}층`).join(' · ')})</>}
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
                ❤️{formatNumber(scaledStats?.hp ?? 0)} ⚔️{formatNumber(scaledStats?.atk ?? 0)} 🛡️{formatNumber(scaledStats?.def ?? 0)}{' '}
                ({difficulty.name} ×{mult} · 전투마다 ±15% 편차)
              </small>
              <small>
                계열 <FamilyBadge family={info.species.family} />
                {environment && (
                  <>
                    {' · '}🌍 {environment.name}
                    {environment.family ? ` — ${environment.description}` : ''}
                  </>
                )}
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
                ✓ 이미 깬 층 · 다시 이기면 +{formatNumber(Math.round(info.rewards.repeatCoins * mult))} G
                {info.rewards.firstEquipmentRarity !== null && (
                  <>
                    {' · '}
                    {Math.round(info.rewards.repeatCopyChance * 100)}% 확률로{' '}
                    {RARITIES[info.rewards.firstEquipmentRarity].name} 장비 복사본
                  </>
                )}
                {info.rewards.repeatDiamondChance > 0 && (
                  <>
                    {' · '}
                    {Math.round(info.rewards.repeatDiamondChance * 100)}% 확률로 💎 {info.rewards.repeatDiamonds}개
                  </>
                )}
              </>
            ) : (
              <>
                🎁 첫 클리어 보상 +{formatNumber(Math.round(info.rewards.firstCoins * mult))} G
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
          familyRules={{ enemy: info?.species?.family ?? null, environment: environment?.family ?? null }}
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

      <div className="boss-fight-buttons">
        <button
          className="button primary full battle-fight-button"
          disabled={!selected || !info || fighting || animating || cooldownRemaining > 0 || attemptsLeft <= 0 || duelBusy}
          onClick={fight}
        >
          {attemptsLeft <= 0
            ? '오늘 도전 횟수를 모두 썼어요 (내일 다시)'
            : cooldownRemaining > 0
              ? `⏳ ${formatDuration(cooldownRemaining)} 뒤에 다시 도전할 수 있어요`
              : !info
                ? '층을 불러오는 중이에요'
                : !selected
                  ? '내보낼 식구를 먼저 골라주세요'
                  : fighting
                    ? '도전 중...'
                    : animating
                      ? '전투가 진행 중이에요...'
                      : `⚔️ 자동 전투 · ${info.floor}층${info.isBoss ? ' 보스' : ''}`}
        </button>
        {attemptsLeft > 0 && cooldownRemaining <= 0 && (
          <button
            className="button secondary full battle-fight-button"
            disabled={!selected || !info || fighting || animating || duelBusy}
            onClick={() => void startDuel()}
          >
            {duelBusy ? '준비 중...' : '🎮 직접 전투'}
          </button>
        )}
      </div>
      <p className="footnote">
        🎮 직접 전투는 매 턴 행동(공격·방어 태세·강력한 일격·회복)을 직접 골라요. 보스가 강타·웅크리기를 하기 전에 미리 알려 주니
        보고 대응해 보세요. 보상은 자동 전투와 똑같고, 공격만 고르면 자동 전투와 같은 결과가 나와요.
      </p>

      {attemptsLeft <= 0 && nextExtraCost !== null && (
        <button
          className="button secondary full"
          disabled={buying || fighting || animating || gameState.diamonds < nextExtraCost}
          onClick={() => void buyAttempt()}
        >
          💎 {nextExtraCost}개로 추가 도전 1회 구매 (오늘 {extraBought}/{catalog?.extraAttemptCosts.length}회 구매)
          {gameState.diamonds < nextExtraCost && ' · 다이아가 부족해요'}
        </button>
      )}
      {cooldownRemaining > 0 && attemptsLeft > 0 && skipCost > 0 && (
        <button
          className="button secondary full"
          disabled={buying || fighting || animating || gameState.diamonds < skipCost}
          onClick={() => void skipCooldown()}
        >
          ⏩ 💎 {skipCost}개로 쿨타임 건너뛰기
          {gameState.diamonds < skipCost && ' · 다이아가 부족해요'}
        </button>
      )}

      {result && (
        <section className="panel battle-result">
          <div className={`battle-banner ${animating ? 'ongoing' : result.result}`}>
            {animating
              ? '⚔️ 전투 중...'
              : result.result === 'win'
                ? result.firstClear
                  ? `🎉 [${result.difficulty.name}] ${result.floor}층 첫 클리어!`
                  : '🎉 승리!'
                : '💧 패배...'}
          </div>
          {result.rules && <BattleRulesBanner rules={result.rules} />}
          <div className="battle-vs">
            <FighterCard fighter={result.mine} label="내 식구" hp={myHp} acting={lastTurn?.attacker === 'me'} />
            <span className="battle-vs-mark">VS</span>
            <FighterCard
              fighter={{ ...result.enemy, levelLabel: `${result.floor}층 · ${result.difficulty.name}` }}
              label={result.isBoss ? '👹 보스' : '수문장'}
              hp={enemyHp}
              acting={lastTurn?.attacker === 'enemy'}
            />
          </div>
          <div className="battle-log" ref={logRef}>
            {visibleLog.map((turn, i) => (
              <Fragment key={i}>
                <div className={`battle-log-row ${turn.attacker}`}>
                  <span>
                    {turn.attacker === 'me' ? (turn.damage === 0 && turn.note ? '내 행동' : '내 공격') : result.isBoss ? '보스 공격' : '상대 공격'}
                  </span>
                  <span>{turn.attacker === 'me' && turn.damage === 0 && turn.note ? '—' : `-${formatNumber(turn.damage)}`}</span>
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
