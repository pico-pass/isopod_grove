import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ExpeditionInfo, ExpeditionResponse, GameState, Species, Terrarium, WeatherInfo } from '../api/types';
import { RARITIES, formatNumber, getCapacity, getPopulationCount } from '../utils/gameCalc';
import { SpeciesImage } from './SpeciesImage';
import { WeatherBanner } from './WeatherBanner';

export function ExpeditionView({
  gameState,
  terrarium,
  species,
  onExpedition,
  weather,
}: {
  gameState: GameState;
  terrarium: Terrarium;
  species: Species[];
  onExpedition: (tier: number) => Promise<ExpeditionResponse | null>;
  weather: WeatherInfo | null;
}) {
  const [info, setInfo] = useState<ExpeditionInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<ExpeditionResponse | null>(null);

  const loadInfo = useCallback(async () => {
    try {
      setInfo(await api.getExpeditionInfo());
    } catch {
      // 가격표를 못 불러오면 다음 원정 뒤에 다시 시도한다.
    }
  }, []);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(loadInfo);
  }, [loadInfo]);

  const go = async (tier: number) => {
    if (busy) return;
    setBusy(true);
    const r = await onExpedition(tier);
    if (r) setLast(r);
    await loadInfo(); // 탐색 횟수가 늘면 가격이 바뀐다.
    setBusy(false);
  };

  const room = getCapacity(terrarium.spaceLevel) - getPopulationCount(terrarium.population);
  const noRoom = room < (info?.yield ?? 2);
  // 등급별로 아직 도감에 없는 종 수(원정은 그 등급에 못 만난 종이 있으면 그중에서 먼저 만나게 해줘요)
  const missing = RARITIES.map(
    (_, rarity) => species.filter((s) => s.rarity === rarity && !gameState.discovered.includes(s.speciesId)).length,
  );
  const pityLeft = info ? Math.max(0, info.pityLimit - info.pity) : null;

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">EXPEDITION</p>
          <h1>
            원정 <span>보유 {formatNumber(gameState.coins)} G</span>
          </h1>
          <p className="subheading">골드를 크게 들여 귀한 식구를 만나러 떠나요.</p>
        </div>
      </div>

      <WeatherBanner weather={weather} compact />
      {weather?.available && weather.favoredFamily && (
        <p className="weather-explore-note">
          {weather.icon} 오늘은 같은 등급 안에서 {weather.favoredFamily === 'fire' ? '불꽃' : weather.favoredFamily === 'forest' ? '숲' : '서리'} 계열 종을 만날 확률이 {weather.exploreWeight ?? 2}배예요.
        </p>
      )}
      <div className="info-banner">
        🧭 숲 탐색 비용에 비례하는 골드를 내고 <b>에픽 이상</b>을 확정으로 만나요(대원정은 전설·신화 확률이 더 높아요). 하루에 원정은 {info?.tiers[0]?.dailyLimit ?? 5}번, 대원정은 {info?.tiers[1]?.dailyLimit ?? 3}번까지 갈 수 있어요. 같은 등급에 아직 도감에 없는 종이
        있으면 그중에서 먼저 만나요. 신화를 못 만난 채 {info?.pityLimit ?? 30}번 다녀오면 다음 원정은 신화가 확정이에요. 원정도 숲 탐색 한 번으로
        세어져서 다음 탐색 비용이 올라가요(탐색권으로는 갈 수 없어요). 📍 <b>{terrarium.name}</b>으로 {info?.yield ?? 2}마리를 데려와요.
      </div>

      <section className="panel expedition-pity">
        <div>
          <strong>🌟 신화 천장</strong>
          {info ? (
            <p>
              신화 없이 {info.pity}번 다녀왔어요 · <b>{pityLeft === 1 ? '다음 원정은 신화 확정!' : `${pityLeft}번 더 가면 신화 확정`}</b>
            </p>
          ) : (
            <p>불러오는 중이에요...</p>
          )}
        </div>
        <div className="mini-xp-bar">
          <i style={{ width: `${info ? Math.min(100, (info.pity / info.pityLimit) * 100) : 0}%` }} />
        </div>
        <small>
          아직 못 만난 종 —{' '}
          {RARITIES.map((r, i) => (
            <span key={r.name} style={{ color: r.color }}>
              {r.name} {missing[i]}종{i < RARITIES.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </small>
      </section>

      {!info ? (
        <p className="empty">원정 정보를 불러오는 중이에요...</p>
      ) : (
        <div className="upgrade-grid">
          {info.tiers.map((t) => {
            const poor = gameState.coins < t.price;
            const left = Math.max(0, t.dailyLimit - t.usedToday);
            const spent = left <= 0;
            return (
              <article className="upgrade-card expedition-card" key={t.tier}>
                <span style={{ fontSize: '1.5rem' }}>{t.tier === 1 ? '🧭' : '🏔️'}</span>
                <h2>{t.name}</h2>
                <small className={`expedition-daily${spent ? ' spent' : ''}`}>
                  오늘 {t.usedToday}/{t.dailyLimit}번{spent ? ' · 내일 다시' : ` · ${left}번 남음`}
                </small>
                <div className="expedition-odds">
                  {t.odds.map((o) => (
                    <span key={o.rarity} style={{ color: RARITIES[o.rarity].color }}>
                      {RARITIES[o.rarity].name} {o.percent}%
                    </span>
                  ))}
                </div>
                <button
                  className="button primary full"
                  disabled={busy || gameState.paused || spent || poor || noRoom}
                  onClick={() => void go(t.tier)}
                >
                  <span>{busy ? '떠나는 중...' : '원정 떠나기'}</span>
                  <span>{formatNumber(t.price)} G</span>
                </button>
                {spent && <small className="equip-hint">오늘은 {t.name}을 모두 다녀왔어요 (자정에 초기화돼요)</small>}
                {!spent && poor && <small className="equip-hint">골드가 {formatNumber(t.price - gameState.coins)} G 모자라요</small>}
                {!spent && !poor && noRoom && <small className="equip-hint">{terrarium.name}에 자리가 없어요 — 분양하거나 확장해 주세요</small>}
              </article>
            );
          })}
        </div>
      )}

      {last && (
        <section className="panel expedition-result">
          <p className="nav-caption">지난 원정 결과</p>
          <div className="expedition-result-row">
            <SpeciesImage species={last.species} style={{ filter: last.species.filter }} />
            <div>
              <h3>
                {last.species.name}{' '}
                <span className="pill" style={{ color: RARITIES[last.rarity].color }}>
                  {RARITIES[last.rarity].name}
                </span>
                {last.isNew && <span className="pill"> ✨ NEW</span>}
                {last.forced && <span className="pill"> 🌟 천장</span>}
              </h3>
              <p>{last.message}</p>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
