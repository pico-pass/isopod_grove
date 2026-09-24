import { useEffect, useState } from 'react';
import type { GameState, Quest, Species, Terrarium } from '../api/types';
import { WanderingCreatures } from './WanderingCreatures';
import {
  MAX_TERRARIUMS,
  RARITIES,
  canBreedInEnvironment,
  formatDuration,
  formatNumber,
  getAutoIncomeRate,
  getBaseBreedSeconds,
  getBreedInterval,
  getCapacity,
  getPopulationCount,
  getTerrariumCost,
  isComfortable,
} from '../utils/gameCalc';
import { SpeciesImage } from './SpeciesImage';

export function HabitatView({
  gameState,
  terrarium,
  species,
  quests,
  onSelectTerrarium,
  onAddTerrarium,
  onMove,
  onCare,
  onObserve,
  onCollect,
  onExplore,
  onClaim,
}: {
  gameState: GameState;
  terrarium: Terrarium;
  species: Species[];
  quests: Quest[];
  onSelectTerrarium: (terrariumId: string) => void;
  onAddTerrarium: () => void;
  onMove: (speciesId: string, toTerrariumId: string) => void;
  onCare: (action: 'feed' | 'mist' | 'climate') => void;
  onObserve: (speciesId: string) => void;
  onCollect: () => void;
  onExplore: () => void;
  onClaim: (questId: string) => void;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const speciesById = new Map(species.map((s) => [s.speciesId, s]));
  const spaceLevel = terrarium.spaceLevel;
  const soilLevel = gameState.upgrades.soil || 0;
  const nurseryLevel = gameState.upgrades.nursery || 0;
  const capacity = getCapacity(spaceLevel);
  const count = getPopulationCount(terrarium.population);
  const comfortable = isComfortable(terrarium.food, terrarium.humidity, terrarium.temperature);
  const canBreed = canBreedInEnvironment(terrarium.food, terrarium.humidity, terrarium.temperature);
  // 수익은 모든 사육장이 함께 모으므로 전체 합계를 보여준다.
  const rate = gameState.terrariums.reduce(
    (sum, t) =>
      sum +
      getAutoIncomeRate(
        t.population,
        species,
        soilLevel,
        isComfortable(t.food, t.humidity, t.temperature),
      ),
    0,
  );
  const otherTerrariums = gameState.terrariums.filter((t) => t.terrariumId !== terrarium.terrariumId);
  const atMaxTerrariums = gameState.terrariums.length >= MAX_TERRARIUMS;
  const addCost = getTerrariumCost(gameState.terrariums.length);

  const residentIds = Object.keys(terrarium.population).filter(
    (id) => (terrarium.population[id] || 0) > 0,
  );

  const cooldownRemaining = (action: string) => {
    if (!now) return 0;
    const until = gameState.cooldowns[`${terrarium.terrariumId}:${action}`] || 0;
    return Math.max(0, Math.ceil((until - now) / 1000));
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <span className="live-dot" />
            YOUR LIVING TERRARIUM
          </p>
          <h1>나의 사육장</h1>
          <p className="subheading">오늘도 작은 숲에 새로운 하루가 시작됐어요.</p>
        </div>
      </div>

      <div className="game-columns">
        <div className="habitat-column">
          <div className="terrarium-tabs" role="tablist" aria-label="사육장 선택">
            {gameState.terrariums.map((t) => {
              const active = t.terrariumId === terrarium.terrariumId;
              return (
                <button
                  key={t.terrariumId}
                  role="tab"
                  aria-selected={active}
                  className={`terrarium-tab${active ? ' active' : ''}`}
                  onClick={() => onSelectTerrarium(t.terrariumId)}
                >
                  <span>{t.name}</span>
                  <small>
                    {getPopulationCount(t.population)}/{getCapacity(t.spaceLevel)}
                  </small>
                </button>
              );
            })}
            <button
              className="terrarium-tab add"
              disabled={atMaxTerrariums || gameState.paused || gameState.coins < addCost}
              onClick={onAddTerrarium}
              title={`사육장 ${gameState.terrariums.length}/${MAX_TERRARIUMS}개`}
            >
              {atMaxTerrariums ? `최대 ${MAX_TERRARIUMS}개` : `＋ 사육장 추가 · ${formatNumber(addCost)} G`}
            </button>
          </div>

          <div className="stat-row">
            <div className="stat">
              <span className="stat-icon green">🐛</span>
              <div>
                <span className="stat-label">함께하는 등각류</span>
                <strong>
                  {count} <small>/ {capacity}마리</small>
                </strong>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon amber">💰</span>
              <div>
                <span className="stat-label">분당 예상 수익{gameState.terrariums.length > 1 ? ' (전체)' : ''}</span>
                <strong>
                  {Math.round(rate * 60)} <small>G</small>
                </strong>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon purple">📖</span>
              <div>
                <span className="stat-label">발견한 종</span>
                <strong>
                  {gameState.discovered.length} <small>/ {species.length}종</small>
                </strong>
              </div>
            </div>
          </div>

          <div className={`terrarium${gameState.paused ? ' is-paused' : ''}`}>
            <img className="terrain-image" src="/assets/terrarium.webp" alt="이끼와 낙엽이 있는 작은 숲 사육장" />
            <div className="terrain-shade" />
            <div className="scene-top">
              <span className="habitat-badge">🍃 {terrarium.name} <b>Lv. {spaceLevel + 1}</b></span>
            </div>
            <WanderingCreatures
              key={terrarium.terrariumId}
              population={terrarium.population}
              speciesById={speciesById}
              paused={gameState.paused}
              onObserve={onObserve}
            />
            <div className="scene-bottom">
              <span>
                <i className="live-dot" />
                {gameState.paused
                  ? '숲이 잠시 쉬고 있어요'
                  : count >= capacity
                    ? '새 식구를 위해 공간을 넓혀 주세요'
                    : comfortable
                      ? '모두 편안하게 지내고 있어요'
                      : '먹이와 환경을 확인해 주세요'}
              </span>
              <span className="scene-count">{count}마리 거주 중</span>
            </div>
          </div>

          <div className="environment-bar">
            <div>
              <span>
                💧 습도 <b>{Math.round(terrarium.humidity)}%</b>
              </span>
              <div className="meter">
                <i style={{ width: `${Math.min(100, Math.max(0, terrarium.humidity))}%` }} />
              </div>
              <small>쾌적 65–85%</small>
            </div>
            <div>
              <span>
                🌡️ 온도 <b>{terrarium.temperature.toFixed(1)}°C</b>
              </span>
              <div className="meter amber">
                <i style={{ width: `${Math.min(100, (terrarium.temperature / 35) * 100)}%` }} />
              </div>
              <small>쾌적 20–26°C</small>
            </div>
            <div>
              <span>
                🌿 먹이 <b>{Math.round(terrarium.food)}%</b>
              </span>
              <div className="meter green">
                <i style={{ width: `${Math.min(100, Math.max(0, terrarium.food))}%` }} />
              </div>
              <small>{gameState.upgrades.feeder ? '자동으로 채워져요' : terrarium.food < 25 ? '먹이를 채워 주세요' : '넉넉해요'}</small>
            </div>
          </div>

          <div className="care-actions">
            <button
              className="care-button"
              disabled={gameState.paused || cooldownRemaining('feed') > 0}
              onClick={() => onCare('feed')}
            >
              <span className="care-icon peach">🌿</span>
              <strong>먹이 주기</strong>
              <small>{cooldownRemaining('feed') > 0 ? `${cooldownRemaining('feed')}초 후 다시` : '낙엽 뷔페 · 무료'}</small>
            </button>
            <button
              className="care-button"
              disabled={gameState.paused || cooldownRemaining('mist') > 0}
              onClick={() => onCare('mist')}
            >
              <span className="care-icon blue">💧</span>
              <strong>분무하기</strong>
              <small>{cooldownRemaining('mist') > 0 ? `${cooldownRemaining('mist')}초 후 다시` : '촉촉한 숲 · 무료'}</small>
            </button>
            <button
              className="care-button"
              disabled={gameState.paused || cooldownRemaining('climate') > 0}
              onClick={() => onCare('climate')}
            >
              <span className="care-icon yellow">🌡️</span>
              <strong>온도 맞추기</strong>
              <small>{cooldownRemaining('climate') > 0 ? `${cooldownRemaining('climate')}초 후 다시` : '적정 온도 · 무료'}</small>
            </button>
            <button className="care-button collect" disabled={gameState.paused || gameState.pending < 1} onClick={onCollect}>
              <span className="care-icon lime">🪙</span>
              <strong>수익 받기</strong>
              <small>
                <b>{formatNumber(gameState.pending)}</b> G 모였어요
              </small>
            </button>
          </div>

          <div className="residents-heading">
            <h2>
              우리 숲의 식구들 <span>{residentIds.length}종</span>
            </h2>
          </div>
          <div className="residents-list">
            {residentIds.map((id) => {
              const sp = speciesById.get(id);
              if (!sp) return null;
              const residents = terrarium.population[id] || 0;
              const interval = getBreedInterval(getBaseBreedSeconds(sp.rarity), nurseryLevel);
              const progress = Math.min(interval, terrarium.breeding[id] || 0);
              const ratio = interval > 0 ? progress / interval : 0;
              const breedStatus =
                residents < 2
                  ? '번식하려면 2마리 이상 필요해요'
                  : !canBreed
                    ? '환경이 좋지 않아 번식이 멈췄어요'
                    : count >= capacity
                      ? '공간이 가득 차서 기다리는 중이에요'
                      : `다음 새끼까지 ${formatDuration(interval - progress)}`;
              const breedActive = residents >= 2 && canBreed && count < capacity;
              return (
                <div key={id} className="resident">
                  <button className="resident-main" onClick={() => onObserve(id)}>
                  <SpeciesImage species={sp} style={{ filter: sp.filter }} />
                  <span>
                    <span className="resident-name">{sp.name}</span>
                    <small>
                      {RARITIES[sp.rarity].name} · 분당 {(sp.rate * 60 * (1 + soilLevel * 0.25)).toFixed(1)} G / 마리
                    </small>
                    <span className="breed-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label={`${sp.name} 번식 진행률`}>
                      <i className={breedActive ? undefined : 'idle'} style={{ width: `${ratio * 100}%` }} />
                    </span>
                    <small className="breed-status">
                      🥚 {Math.floor(ratio * 100)}% · {breedStatus}
                    </small>
                  </span>
                  <b>{residents}마리</b>
                  </button>
                  {otherTerrariums.length > 0 && (
                    <select
                      className="move-select"
                      value=""
                      disabled={gameState.paused}
                      aria-label={`${sp.name} 이사 보내기`}
                      onChange={(e) => {
                        if (e.target.value) onMove(id, e.target.value);
                      }}
                    >
                      <option value="">이사 ▾</option>
                      {otherTerrariums.map((t) => {
                        const room = getCapacity(t.spaceLevel) - getPopulationCount(t.population);
                        const fits = room >= residents;
                        return (
                          <option key={t.terrariumId} value={t.terrariumId} disabled={!fits}>
                            {t.name} · 여유 {Math.max(0, room)}마리{fits ? '' : ' (자리 부족)'}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="right-column">
          <section className="panel goal-panel">
            <div className="panel-heading">
              <h2>🚩 오늘의 작은 목표</h2>
              <span>{gameState.daily.claimed.length}/{quests.length}</span>
            </div>
            <p>조금씩 돌보면, 어느새 울창해져요.</p>
            <div>
              {quests.map((q) => {
                const progress = gameState.daily[q.questId as 'feed' | 'observe' | 'births'] ?? 0;
                const complete = progress >= q.target;
                const claimed = gameState.daily.claimed.includes(q.questId);
                return (
                  <div className="quest" key={q.questId}>
                    <span className={`quest-check${complete ? ' complete' : ''}`}>{complete ? '✓' : ''}</span>
                    <div className="quest-info">
                      <div className="quest-title">
                        {q.label}
                        <span>
                          {Math.min(q.target, progress)}/{q.target}
                        </span>
                      </div>
                      <div className="quest-progress">
                        <i style={{ width: `${Math.min(100, (progress / q.target) * 100)}%` }} />
                      </div>
                      <div className="quest-reward">
                        <span>{claimed ? '보상 받음' : `보상 ${q.reward} G`}</span>
                        {complete && !claimed && (
                          <button className="claim-button" onClick={() => onClaim(q.questId)}>
                            받기
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="explore-banner">
            <span className="eyebrow">A NEW LITTLE FRIEND</span>
            <h3>낙엽 아래엔 누가 있을까?</h3>
            <p>숲을 탐색하고 새로운 종을 만나보세요.</p>
            <button className="button primary full" disabled={gameState.paused} onClick={onExplore}>
              🔍 숲 탐색하기 <span className="price">180 G</span>
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
