import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { BoostKind, BoostShop, BuyBoostResponse, GameState } from '../api/types';
import { formatDuration, formatNumber, getBoostUntil } from '../utils/gameCalc';

const ICONS: Record<BoostKind, string> = { income: '💰', breed: '🥚', battleXp: '⚔️' };
const SHOP_REFRESH_MS = 30_000;

export function BoostShopView({
  gameState,
  onBuy,
}: {
  gameState: GameState;
  onBuy: (kind: BoostKind, hours: number) => Promise<BuyBoostResponse | null>;
}) {
  const [shop, setShop] = useState<BoostShop | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);

  const loadShop = useCallback(async () => {
    try {
      setShop(await api.getBoostShop());
    } catch {
      // 가격표를 못 불러오면 다음 갱신 때 다시 시도한다.
    }
  }, []);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(() => {
      setNow(Date.now());
      return loadShop();
    });
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(() => void loadShop(), SHOP_REFRESH_MS);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [loadShop]);

  const buy = async (kind: BoostKind, hours: number) => {
    if (busy) return;
    setBusy(true);
    await onBuy(kind, hours);
    await loadShop(); // 사고 나면 가격(시간당 수익 기준)과 남은 시간을 다시 받는다.
    setBusy(false);
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BOOST SHOP</p>
          <h1>
            부스트 상점 <span>보유 {formatNumber(gameState.coins)} G</span>
          </h1>
          <p className="subheading">골드를 내고 일정 시간 동안 숲의 시간을 빠르게 돌려 보세요.</p>
        </div>
      </div>

      <div className="info-banner">
        ⚡ 켜져 있는 동안 수익·번식·전투 경험치가 {shop?.multiplier ?? 2}배가 돼요. 가격은 내 사육장이 한 시간에 버는 최대 수익
        {shop ? `(지금 ${formatNumber(shop.hourlyIncome)} G)` : ''}에 맞춰 정해져서, 숲이 커질수록 비싸져요. 같은 부스트를 이어서 사면 시간이 더해지고
        최대 {shop?.maxStackHours ?? 24}시간까지 쌓여요. 4시간짜리는 1시간짜리 4개보다 10% 저렴해요.
      </div>

      {!shop ? (
        <p className="empty">상점을 불러오는 중이에요...</p>
      ) : (
        <div className="upgrade-grid">
          {shop.boosts.map((b) => {
            const until = getBoostUntil(gameState, b.kind, now);
            const remainingSec = until > 0 ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
            return (
              <article className="upgrade-card boost-card" key={b.kind}>
                <span style={{ fontSize: '1.5rem' }}>{ICONS[b.kind] ?? '⚡'}</span>
                <span className={`upgrade-level${remainingSec > 0 ? ' boost-on' : ''}`}>
                  {remainingSec > 0 ? `⚡ 켜짐 · ${formatDuration(remainingSec)} 남음` : '꺼짐'}
                </span>
                <h2>{b.name}</h2>
                <p>{b.description}</p>
                <div className="boost-offers">
                  {b.offers.map((o) => {
                    const overStack = remainingSec / 3600 + o.hours > shop.maxStackHours;
                    const poor = gameState.coins < o.price;
                    return (
                      <button
                        key={o.hours}
                        className="button primary full"
                        disabled={busy || gameState.paused || poor || overStack}
                        onClick={() => void buy(b.kind, o.hours)}
                        title={overStack ? `최대 ${shop.maxStackHours}시간까지만 쌓을 수 있어요` : undefined}
                      >
                        <span>{o.hours}시간</span>
                        <span>{formatNumber(o.price)} G</span>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
