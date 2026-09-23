import { useEffect, useState } from 'react';
import type { GameState, Quest, Species } from '../api/types';
import {
  RARITIES,
  formatNumber,
  getAutoIncomeRate,
  getCapacity,
  getPopulationCount,
  isComfortable,
} from '../utils/gameCalc';

export function HabitatView({
  gameState,
  species,
  quests,
  onCare,
  onObserve,
  onCollect,
  onExplore,
  onClaim,
}: {
  gameState: GameState;
  species: Species[];
  quests: Quest[];
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
  const spaceLevel = gameState.upgrades.space || 0;
  const soilLevel = gameState.upgrades.soil || 0;
  const capacity = getCapacity(spaceLevel);
  const count = getPopulationCount(gameState.population);
  const comfortable = isComfortable(gameState.food, gameState.humidity, gameState.temperature);
  const rate = getAutoIncomeRate(gameState.population, species, soilLevel, comfortable);

  const residentIds = Object.keys(gameState.population).filter(
    (id) => (gameState.population[id] || 0) > 0,
  );

  const cooldownRemaining = (action: string) => {
    if (!now) return 0;
    const until = gameState.cooldowns[action] || 0;
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
                <span className="stat-label">분당 예상 수익</span>
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
              <span className="habitat-badge">🍃 이끼 숲 사육장 <b>Lv. {spaceLevel + 1}</b></span>
            </div>
            <div className="creatures">
              {residentIds.map((id, i) => {
                const sp = speciesById.get(id);
                if (!sp) return null;
                return (
                  <button
                    key={id}
                    className="creature"
                    style={{ left: `${8 + ((i * 21) % 74)}%`, top: `${14 + ((i * 17) % 60)}%` }}
                    onClick={() => onObserve(id)}
                    title={`${sp.name} 관찰하기`}
                  >
                    <img src="/assets/isopod.png" alt={sp.name} style={{ filter: sp.filter }} draggable={false} />
                  </button>
                );
              })}
            </div>
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
                💧 습도 <b>{Math.round(gameState.humidity)}%</b>
              </span>
              <div className="meter">
                <i style={{ width: `${Math.min(100, Math.max(0, gameState.humidity))}%` }} />
              </div>
              <small>쾌적 65–85%</small>
            </div>
            <div>
              <span>
                🌡️ 온도 <b>{gameState.temperature.toFixed(1)}°C</b>
              </span>
              <div className="meter amber">
                <i style={{ width: `${Math.min(100, (gameState.temperature / 35) * 100)}%` }} />
              </div>
              <small>쾌적 20–26°C</small>
            </div>
            <div>
              <span>
                🌿 먹이 <b>{Math.round(gameState.food)}%</b>
              </span>
              <div className="meter green">
                <i style={{ width: `${Math.min(100, Math.max(0, gameState.food))}%` }} />
              </div>
              <small>{gameState.upgrades.feeder ? '자동으로 채워져요' : gameState.food < 25 ? '먹이를 채워 주세요' : '넉넉해요'}</small>
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
              return (
                <button key={id} className="resident" onClick={() => onObserve(id)}>
                  <img src="/assets/isopod.png" alt={sp.name} style={{ filter: sp.filter }} />
                  <span>
                    <span className="resident-name">{sp.name}</span>
                    <small>
                      {RARITIES[sp.rarity].name} · 분당 {(sp.rate * 60 * (1 + soilLevel * 0.25)).toFixed(1)} G / 마리
                    </small>
                  </span>
                  <b>{gameState.population[id]}마리</b>
                </button>
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
