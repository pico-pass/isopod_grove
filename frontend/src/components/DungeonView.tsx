import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type {
  DuelActionId,
  DungeonBattleView,
  DungeonDifficultyId,
  DungeonEnded,
  DungeonInfo,
  DungeonRelicView,
  DungeonResponse,
  DungeonRunView,
  GameState,
  LeaderboardResult,
  Species,
} from '../api/types';
import { getFamilyMatchup, getTotalPopulationBySpecies, hasBonuses, formatBonusPercent, formatNumber, type StatBonuses } from '../utils/gameCalc';
import { battleLogLabel, battleLogValue } from '../utils/battleLog';
import { loadRankingLimit, saveRankingLimit, type RankingLimit } from '../utils/rankingLimit';
import { loadDungeonBattleMode, roomChoice, saveDungeonBattleMode, type DungeonBattleMode } from '../utils/dungeonBattleMode';
import { DuelPanel } from './DuelPanel';
import { FamilyBadge } from './FamilyBadge';
import { RankingLimitPicker } from './RankingLimitPicker';
import { RankingList } from './RankingView';
import { SpeciesImage } from './SpeciesImage';
import { SpeciesPickGrid } from './SpeciesPickGrid';

const ENV_LABELS: Record<string, string> = { plain: '🌍 평범한 땅', volcano: '🌋 화산 지대', jungle: '🌳 울창한 숲', tundra: '🧊 서리 평원' };
const TIER_NAMES = ['일반', '희귀', '에픽'];
const TIER_CLASS = ['common', 'rare', 'epic'];
const MATCHUP_TEXT = { advantage: '상성 유리 +3%', even: '상성 같음', disadvantage: '상성 불리 −3%' };
const END_TITLE = { cleared: '👑 던전 완주!', dead: '💀 쓰러졌어요', retired: '🚪 던전에서 나왔어요' };

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

function duelLabel(kind: 'battle' | 'elite' | 'boss', lastFloor: boolean): string {
  if (kind === 'boss') return lastFloor ? '👑 마지막 보스' : '👑 장 보스';
  return kind === 'elite' ? '💀 엘리트' : '⚔️ 일반 전투';
}

// 가진 유물 한 줄 표시: 같은 유물은 하나로 묶고 ×개수를 붙인다.
function RelicStrip({ relics, label }: { relics: DungeonRelicView[]; label?: string }) {
  if (relics.length === 0) return null;
  return (
    <div className="dungeon-relic-strip" aria-label={label}>
      {relics.map((r) => (
        <span key={r.relicId} className={`dungeon-relic-mini tier-${TIER_CLASS[r.tier]}`} title={`${r.name}${(r.count ?? 1) > 1 ? ` ×${r.count}` : ''} — ${r.description}`}>
          {r.icon}
          {(r.count ?? 1) > 1 && <b className="dungeon-relic-count">×{r.count}</b>}
        </span>
      ))}
    </div>
  );
}

function RelicChip({ relic, onClick, disabled, extra }: { relic: DungeonRelicView; onClick?: () => void; disabled?: boolean; extra?: string }) {
  const body = (
    <>
      <span className="dungeon-relic-icon">{relic.icon}</span>
      <span className="dungeon-relic-text">
        <strong>
          {relic.name}
          {relic.maxStacks > 1 && relic.owned !== undefined && <em className="dungeon-relic-stack"> 보유 {relic.owned}/{relic.maxStacks}</em>}
        </strong>
        <small>
          {TIER_NAMES[relic.tier]} · {relic.description}
          {relic.maxStacks > 1 && ` · 최대 ${relic.maxStacks}개 겹침`}
        </small>
      </span>
      {extra && <b className="dungeon-relic-extra">{extra}</b>}
    </>
  );
  return onClick ? (
    <button className={`dungeon-relic tier-${TIER_CLASS[relic.tier]}`} disabled={disabled} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={`dungeon-relic tier-${TIER_CLASS[relic.tier]}`}>{body}</div>
  );
}

// 썩은 통나무 던전(로그라이크): 식구 한 마리로 100층을 올라가요. 10층마다 한 장이고 층마다 방을 골라 들어가며, 이기면 유물을 얻어 빌드를 키워요.
export function DungeonView({
  gameState,
  species,
  equipmentBonuses,
  onStart,
  onChoose,
  onDuelAct,
  onRetire,
  onOpenProfile,
}: {
  gameState: GameState;
  species: Species[];
  equipmentBonuses: StatBonuses;
  onStart: (speciesId: string, difficulty: DungeonDifficultyId) => Promise<DungeonResponse | null>;
  onChoose: (choice: string) => Promise<DungeonResponse | null>;
  onDuelAct: (action: DuelActionId) => Promise<DungeonResponse | null>;
  onRetire: () => Promise<DungeonResponse | null>;
  onOpenProfile: (userId: string) => void;
}) {
  const [info, setInfo] = useState<DungeonInfo | null>(null);
  const [run, setRun] = useState<DungeonRunView | null>(null);
  const [battle, setBattle] = useState<DungeonBattleView | null>(null);
  const [ended, setEnded] = useState<DungeonEnded | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');
  const [difficulty, setDifficulty] = useState<DungeonDifficultyId>('easy');
  const [ranking, setRanking] = useState<LeaderboardResult | null>(null);
  const [rankingLimit, setRankingLimit] = useState<RankingLimit>(loadRankingLimit);
  const [battleMode, setBattleMode] = useState<DungeonBattleMode>(loadDungeonBattleMode);
  const rankingLimitRef = useRef(rankingLimit);

  const loadRanking = useCallback(async () => {
    try {
      setRanking(await api.getDungeonLeaderboard(rankingLimitRef.current));
    } catch {
      // 순위를 못 불러와도 던전은 할 수 있다.
    }
  }, []);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        const status = await api.getDungeon();
        setInfo(status.info);
        setRun(status.run);
      } catch {
        // 정보를 못 불러오면 화면이 비어 보일 뿐이다. 새로고침으로 다시 시도할 수 있다.
      }
      await loadRanking();
    });
  }, [loadRanking]);

  const changeBattleMode = (mode: DungeonBattleMode) => {
    setBattleMode(mode);
    saveDungeonBattleMode(mode);
  };

  const changeLimit = (limit: RankingLimit) => {
    rankingLimitRef.current = limit;
    setRankingLimit(limit);
    saveRankingLimit(limit);
    void loadRanking();
  };

  const apply = (r: DungeonResponse | null) => {
    if (!r) return;
    setRun(r.run);
    setInfo(r.info);
    if (!r.step) setBattle(r.battle);
    if (r.ended) {
      setEnded(r.ended);
      void loadRanking();
    }
  };
  const act = async (fn: () => Promise<DungeonResponse | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      apply(await fn());
    } finally {
      setBusy(false);
    }
  };

  const totals = getTotalPopulationBySpecies(gameState);
  const owned = species.filter((s) => (totals[s.speciesId] || 0) > 0);
  const attemptsLeft = info?.attemptsLeft ?? 0;
  const myFamily = run?.species.family;

  // 100층 전체를 한 줄에 그리면 너무 잘아서, 지금 장(10층)만 그리고 위에 전체 진행도를 따로 보여 준다.
  const progress = (r: DungeonRunView) => {
    const size = info?.chapter ?? 10;
    const chapters = Math.ceil(r.floors / size);
    const chapter = Math.min(chapters, Math.floor((r.floor - 1) / size) + 1);
    const start = (chapter - 1) * size;
    return (
      <>
        <div className="dungeon-chapter">
          <strong>
            {chapter}장 <small>/ {chapters}장</small>
          </strong>
          <small>
            전체 {r.cleared}/{r.floors}층 · 장 보스 {chapter * size}층
          </small>
        </div>
        <div className="dungeon-overall" aria-hidden="true">
          <i style={{ width: `${Math.min(100, (r.cleared / r.floors) * 100)}%` }} />
        </div>
        <div className="dungeon-track" aria-label="이번 장 층 진행도">
          {Array.from({ length: size }, (_, i) => {
            const floor = start + i + 1;
            const done = floor <= r.cleared;
            const current = floor === r.cleared + 1;
            const special = i === size / 2 - 1 ? '💀' : i === size - 1 ? '👑' : '';
            return (
              <span key={floor} className={`dungeon-node${done ? ' done' : ''}${current ? ' current' : ''}`} title={`${floor}층`}>
                {special || floor}
              </span>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ROTTEN LOG DUNGEON</p>
          <h1>
            썩은 통나무 던전{' '}
            {info && (
              <span>
                오늘 {attemptsLeft}/{info.dailyRuns}회 남음
              </span>
            )}
          </h1>
          <p className="subheading">식구 한 마리로 100층까지 올라가요. 방을 고르고, 유물을 모으고, 10층마다 나오는 장 보스를 쓰러뜨리세요.</p>
        </div>
      </div>

      {run ? (
        <>
          <section className="panel dungeon-head">
            <div className="dungeon-hero">
              <SpeciesImage species={run.species} style={{ filter: run.species.filter }} />
              <div>
                <strong>
                  {run.species.name} <small>Lv.{run.species.level}</small> <FamilyBadge family={run.species.family} />
                </strong>
                <p className="dungeon-sub">
                  [{run.difficulty.name}] {run.floor}층 도전 중 · ⚔️ {formatNumber(run.atk)} · 🛡️ {formatNumber(run.def)} · 🍄 버섯조각 {formatNumber(run.gold)}
                  {run.revived && ' · 🐚 되살아남'}
                </p>
                <HpBar hp={run.hp} maxHp={run.maxHp} />
              </div>
            </div>
            {progress(run)}
            <RelicStrip relics={run.relics} label="가진 유물" />
          </section>

          {battle && run.phase !== 'duel' && (
            <details className="panel dungeon-battle" open={!battle.won}>
              <summary>
                {battle.won ? '⚔️ 방금 전투: 승리' : '⚔️ 방금 전투: 패배'}
                {battle.enemy && ` · ${battle.enemy.name}`}
                {battle.hpBefore !== undefined && battle.hpAfter !== undefined && ` · HP ${formatNumber(battle.hpBefore)} → ${formatNumber(battle.hpAfter)}`}
                {battle.revived && ' · 🐚 되살아남'}
              </summary>
              <div className="battle-log">
                {battle.log.map((turn, i) => (
                  <div key={i} className={`battle-log-row ${turn.attacker}`}>
                    <span>{battleLogLabel(turn, '적 공격')}</span>
                    <span>{battleLogValue(turn)}</span>
                    <span>남은 HP {formatNumber(turn.remainingHp)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {run.phase === 'choose' && run.options && (
            <section className="panel">
              <div className="panel-heading">
                <h2>{run.floor}층 · 들어갈 방을 고르세요</h2>
              </div>
              {run.options.some((o) => o.type === 'battle') && (
                <div className="dungeon-battle-mode">
                  <div className="filter-row" role="group" aria-label="일반 전투 방식">
                    <button className={`filter${battleMode === 'auto' ? ' active' : ''}`} disabled={busy} onClick={() => changeBattleMode('auto')}>
                      ⚔️ 자동 전투
                    </button>
                    <button className={`filter${battleMode === 'manual' ? ' active' : ''}`} disabled={busy} onClick={() => changeBattleMode('manual')}>
                      🎮 직접 전투
                    </button>
                  </div>
                  <small>
                    {battleMode === 'manual'
                      ? '일반 전투도 매 턴 행동을 골라요(공격·방어 태세·일격·회복·계열 기술). 보상은 같아요.'
                      : '일반 전투는 자동으로 끝까지 싸워요. 엘리트·보스는 언제나 직접 싸워요.'}
                  </small>
                </div>
              )}
              <div className="dungeon-rooms">
                {run.options.map((o) => {
                  const matchup = o.family && myFamily ? getFamilyMatchup(myFamily, o.family) : null;
                  return (
                    <button key={o.index} className={`dungeon-room room-${o.type}`} disabled={busy} onClick={() => void act(() => onChoose(roomChoice(o.index, o.type, battleMode)))}>
                      <span className="dungeon-room-icon">{o.icon}</span>
                      <strong>{o.name}</strong>
                      <small>{o.description}</small>
                      {o.family && (
                        <span className="dungeon-room-enemy">
                          적 <FamilyBadge family={o.family} />
                          {matchup && <em className={`matchup-${matchup}`}> {MATCHUP_TEXT[matchup]}</em>}
                        </span>
                      )}
                      {o.environment && o.environment !== 'plain' && <small className="dungeon-room-env">{ENV_LABELS[o.environment]}</small>}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {run.phase === 'duel' && run.duel && (
            <DuelPanel
              duel={run.duel}
              title={`${run.floor}층 ${duelLabel(run.duel.kind, run.floor >= run.floors)}`}
              enemyLabel={duelLabel(run.duel.kind, run.floor >= run.floors)}
              enemyLevelLabel="던전의 적"
              enemyAttackLabel={run.duel.kind === 'boss' ? '보스 공격' : run.duel.kind === 'elite' ? '엘리트 공격' : '적 공격'}
              busy={busy}
              onAct={(action) => void act(() => onDuelAct(action))}
            />
          )}

          {run.phase === 'reward' && run.offer && (
            <section className="panel">
              <div className="panel-heading">
                <h2>🎁 유물을 하나 고르세요</h2>
                <span>{run.offerKind === 'boss' ? '장 보스의 보상' : run.offerKind === 'elite' ? '엘리트의 보상' : run.offerKind === 'treasure' ? '보물' : run.offerKind === 'event' ? '이벤트의 보답' : '전투의 보상'}</span>
              </div>
              <div className="dungeon-relics">
                {run.offer.map((r) => (
                  <RelicChip key={r.relicId} relic={r} disabled={busy} onClick={() => void act(() => onChoose(r.relicId))} />
                ))}
              </div>
              <button className="button secondary full" disabled={busy} onClick={() => void act(() => onChoose('skip'))}>
                고르지 않고 🍄 {run.skipGold ?? 30} 받기
              </button>
            </section>
          )}

          {run.phase === 'event' && run.event && (
            <section className="panel dungeon-event">
              <div className="panel-heading">
                <h2>
                  {run.event.icon} {run.event.title}
                </h2>
              </div>
              <p>{run.event.text}</p>
              <div className="dungeon-choices">
                {run.event.choices.map((c) => (
                  <button key={c.id} className="dungeon-choice" disabled={busy || c.disabled} onClick={() => void act(() => onChoose(c.id))}>
                    <strong>{c.label}</strong>
                    <small>{c.disabled ? '버섯조각이 모자라요' : c.hint}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {run.phase === 'shop' && run.shop && (
            <section className="panel">
              <div className="panel-heading">
                <h2>🛒 떠돌이 상점</h2>
                <span>🍄 {formatNumber(run.gold)}</span>
              </div>
              <div className="dungeon-relics">
                {run.shop.relics.map((r) => (
                  <RelicChip
                    key={r.relicId}
                    relic={r}
                    disabled={busy || r.sold || !r.affordable}
                    onClick={() => void act(() => onChoose(`buy:${r.relicId}`))}
                    extra={r.sold ? '품절' : `🍄 ${r.price}`}
                  />
                ))}
                <button className="dungeon-relic" disabled={busy || run.shop.potion.sold || !run.shop.potion.affordable} onClick={() => void act(() => onChoose('potion'))}>
                  <span className="dungeon-relic-icon">🧪</span>
                  <span className="dungeon-relic-text">
                    <strong>회복약</strong>
                    <small>HP {Math.round(run.shop.potion.healRate * 100)}% 회복</small>
                  </span>
                  <b className="dungeon-relic-extra">{run.shop.potion.sold ? '품절' : `🍄 ${run.shop.potion.price}`}</b>
                </button>
              </div>
              <button className="button primary full" disabled={busy} onClick={() => void act(() => onChoose('leave'))}>
                상점에서 나가기
              </button>
            </section>
          )}

          {run.phase === 'rest' && run.rest && (
            <section className="panel">
              <div className="panel-heading">
                <h2>🏕️ 휴식처</h2>
              </div>
              <div className="dungeon-choices">
                <button className="dungeon-choice" disabled={busy} onClick={() => void act(() => onChoose('heal'))}>
                  <strong>💤 푹 쉰다</strong>
                  <small>HP {Math.round(run.rest.healRate * 100)}% 회복</small>
                </button>
                {(['atk', 'def', 'hp'] as const).map((k) => (
                  <button key={k} className="dungeon-choice" disabled={busy} onClick={() => void act(() => onChoose(k))}>
                    <strong>
                      {k === 'atk' ? '⚔️ 공격력 단련' : k === 'def' ? '🛡️ 방어력 단련' : '❤️ 체력 단련'}
                    </strong>
                    <small>
                      +{Math.round(run.rest!.trainBonus * 10000) / 100}% (이번 런 내내)
                    </small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {run.log.length > 0 && (
            <section className="panel dungeon-log">
              {run.log
                .slice(-6)
                .reverse()
                .map((line, i) => (
                  <p key={`${run.log.length}-${i}`}>{line}</p>
                ))}
            </section>
          )}

          <button
            className="button secondary full"
            disabled={busy}
            onClick={() => {
              if (window.confirm('던전에서 나갈까요?\n지금까지 깬 층의 보상은 받아요.')) void act(onRetire);
            }}
          >
            🚪 던전에서 나가기 (깬 층 {run.cleared}층 보상)
          </button>
        </>
      ) : (
        <>
          {ended && (
            <section className={`panel dungeon-result ${ended.reason}`}>
              <h2>{END_TITLE[ended.reason]}</h2>
              <p>
                {info?.difficulties.find((d) => d.id === ended.difficulty)?.name} 난이도 · {ended.floorsCleared}층까지 {ended.cleared ? '완주' : '올랐어요'}
                {ended.newBest && ' · 🏆 최고 기록!'}
              </p>
              <div className="dungeon-reward-row">
                <span>🪙 {formatNumber(ended.gold)} G</span>
                <span>⭐ 경험치 +{formatNumber(ended.xp)}</span>
                {ended.diamonds > 0 && <span>💎 +{ended.diamonds}</span>}
                {ended.levelAfter > ended.levelBefore && <span>🆙 Lv.{ended.levelAfter}</span>}
                {ended.equipment.map((e) => (
                  <span key={e.itemId}>🎒 {e.name}{e.isNew ? ' (NEW)' : ''}</span>
                ))}
              </div>
              <RelicStrip relics={ended.relics} />
            </section>
          )}

          <div className="stat-row">
            <div className="stat">
              <div>
                <span className="stat-label">최고 기록</span>
                <strong>{info?.bestLabel ?? '아직 없어요'}</strong>
              </div>
            </div>
            <div className="stat">
              <div>
                <span className="stat-label">완주</span>
                <strong>
                  {info?.clears ?? 0} <small>회</small>
                </strong>
              </div>
            </div>
            <div className="stat">
              <div>
                <span className="stat-label">유물 도감</span>
                <strong>
                  {info?.relicsSeen.length ?? 0} <small>/ {info?.relics.length ?? 0}종</small>
                </strong>
              </div>
            </div>
          </div>

          <p className="nav-caption">난이도</p>
          <div className="filter-row dungeon-difficulty" role="group" aria-label="난이도">
            {(info?.difficulties ?? []).map((d) => (
              <button key={d.id} className={`filter${difficulty === d.id ? ' active' : ''}`} onClick={() => setDifficulty(d.id)}>
                {d.name} <small>보상 ×{d.rewardMult}</small>
              </button>
            ))}
          </div>
          <div className="info-banner">
            🪵 100층까지 층마다 방 2~3개 중 하나를 골라 올라가요(⚔️ 전투 · 💀 엘리트 · 🏕️ 휴식 · 🛒 상점 · ❓ 이벤트 · 💎 보물). 10층마다 한 장이 끝나요 — 5층은 엘리트,
            10층은 장 보스예요. 장 보스를 쓰러뜨리면 공격·방어·체력이 {Math.round((info?.chapterBonus ?? 0.04) * 100)}% 오르고 HP를 크게 회복하며 에픽 유물 중에서 고를 수 있어요. 같은 유물은
            최대 개수까지 겹쳐 가져요. 일반 전투는 자동으로도, 직접 턴마다 행동을 골라서도 할 수 있어요(방을 고르는 화면에서 바꿔요). 엘리트·보스는 언제나 직접 싸우고(계열 기술도 써요), 쓰러지면 깬 층만큼 보상을 받아요. 식구의 힘에 맞는 난이도를 골라 보세요 — 어려울수록 보상이 커요.
            {info && info.milestones.length > 0 && (
              <>
                <br />
                💎 처음 넘는 층 보상(최고 기록을 넘을 때): {info.milestones.map((m) => `${m.floor}층 ${m.diamonds}개`).join(' · ')}
              </>
            )}
          </div>

          <p className="nav-caption">입장할 식구 선택</p>
          {owned.length === 0 ? (
            <p className="empty">아직 전투에 내보낼 식구가 없어요.</p>
          ) : (
            <SpeciesPickGrid species={owned} gameState={gameState} activeId={selected} disabled={busy} bonuses={equipmentBonuses} familyRules={{ enemy: null, environment: null }} onPick={setSelected} />
          )}
          {hasBonuses(equipmentBonuses) && (
            <div className="info-banner">
              🎒 장착 장비 — 공격력 {formatBonusPercent(equipmentBonuses.atk)} · 방어력 {formatBonusPercent(equipmentBonuses.def)} · HP {formatBonusPercent(equipmentBonuses.hp)}가 입장할 때 적용돼요.
            </div>
          )}
          <button className="button primary full battle-fight-button" disabled={!selected || busy || attemptsLeft <= 0} onClick={() => void act(() => onStart(selected, difficulty))}>
            {attemptsLeft <= 0 ? '오늘 입장 횟수를 모두 썼어요 (내일 다시)' : !selected ? '입장할 식구를 먼저 골라주세요' : busy ? '입장 중...' : '🪵 던전 입장'}
          </button>

          {info && (
            <section className="panel">
              <div className="panel-heading">
                <h2>📜 유물 도감</h2>
                <span>
                  {info.relicsSeen.length}/{info.relics.length}
                </span>
              </div>
              <div className="dungeon-codex">
                {info.relics.map((r) => {
                  const seen = info.relicsSeen.includes(r.relicId);
                  return seen ? (
                    <span key={r.relicId} className={`dungeon-codex-item tier-${TIER_CLASS[r.tier]}`} title={`${r.name} — ${r.description}`}>
                      {r.icon} {r.name}
                    </span>
                  ) : (
                    <span key={r.relicId} className="dungeon-codex-item unseen" title="아직 못 만난 유물">
                      ❔ ???
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          <div className="panel">
            <div className="panel-heading">
              <h2>🏆 던전 순위</h2>
              <span>높이 오른 난이도·층 순</span>
            </div>
            <RankingLimitPicker value={rankingLimit} onChange={changeLimit} />
            <RankingList result={ranking} loading={false} valueOf={(v) => String(v)} onOpenProfile={onOpenProfile} />
          </div>
        </>
      )}
    </section>
  );
}
