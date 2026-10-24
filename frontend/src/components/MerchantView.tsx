import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { MerchantResponse, MerchantStatus } from '../api/types';
import { formatDuration, formatNumber } from '../utils/gameCalc';

const VERDICT = { sale: { text: '🔥 오늘의 특가', cls: 'sale' }, cheap: { text: '👍 싸게 나왔어요', cls: 'cheap' }, normal: { text: '보통 가격', cls: 'normal' }, pricey: { text: '💸 비싸요', cls: 'pricey' } } as const;

// 떠돌이 상인: 매일 다른 한정 재고를 팔아요. 가격은 그날의 달과 숲 날씨에 따라 오르내리고, 하루에 살 수 있는 개수가 정해져 있어서 오늘 안 사면 사라져요.
export function MerchantView({ paused, onBuy }: { paused: boolean; onBuy: (itemId: string, count: number) => Promise<MerchantResponse | null> }) {
  const [status, setStatus] = useState<MerchantStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getMerchant());
      } catch {
        setFailed(true);
      }
    });
  }, []);

  const buy = async (itemId: string, count: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await onBuy(itemId, count);
      if (r) setStatus(r.status);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WANDERING MERCHANT</p>
          <h1>
            떠돌이 상인 <span>보유 {status ? formatNumber(status.coins) : '…'} G</span>
          </h1>
          <p className="subheading">매일 다른 한정 재고를 가지고 와요. 가격은 그날의 달과 숲 날씨에 따라 오르내려서, 싸게 나온 날 사 두는 판단이 필요해요.</p>
        </div>
      </div>
      {failed && <p className="empty">상인 정보를 불러오지 못했어요. 새로고침으로 다시 시도해 주세요.</p>}
      {!status && !failed && <p className="empty">상인이 짐을 푸는 중이에요…</p>}
      {status && (
        <>
          <section className="panel merchant-today">
            <span className="merchant-chip">
              {status.moon.icon} 오늘의 달 <b>{status.moon.name}</b>
            </span>
            <span className="merchant-chip">{status.weather ? `${status.weather.icon} 숲 날씨 ${status.weather.name}` : '🌫️ 날씨 정보 없음'}</span>
            <span className="merchant-chip">⏰ 상인은 {formatDuration(status.resetsInMs / 1000)} 뒤 떠나요 — 오늘 안 사면 없어요</span>
          </section>
          <div className="merchant-items">
            {status.items.map((it) => {
              const v = VERDICT[it.verdict];
              const sold = it.left <= 0;
              const afford = status.coins >= it.price;
              const percent = Math.round((it.price / it.base - 1) * 100);
              return (
                <section key={it.id} className={`panel merchant-item verdict-${v.cls}${sold ? ' sold' : ''}`}>
                  <div className="merchant-head">
                    <span className="merchant-icon" aria-hidden="true">{it.icon}</span>
                    <div>
                      <h3>{it.name}</h3>
                      <span className="pill">{it.tag}</span>
                    </div>
                  </div>
                  <p className="merchant-desc">{it.desc}</p>
                  <p className="merchant-price">
                    <b>{formatNumber(it.price)} G</b> <small>(기준 {formatNumber(it.base)} G · {percent === 0 ? '±0' : percent > 0 ? `+${percent}` : percent}%)</small>
                  </p>
                  <p className={`merchant-verdict ${v.cls}`}>{v.text}</p>
                  <p className="merchant-limit">
                    {it.alreadyOwned ? '이미 가지고 있어요' : `오늘 한정 ${it.limit}개 · ${it.bought}개 구매 · ${sold ? '품절' : `${it.left}개 남음`}`}
                  </p>
                  <div className="merchant-actions">
                    <button className="button primary" disabled={busy || paused || sold || !afford} title={!afford && !sold ? '골드가 부족해요' : undefined} onClick={() => void buy(it.id, 1)}>
                      {sold ? '품절' : '1개 사기'}
                    </button>
                    {it.left > 1 && (
                      <button className="button secondary" disabled={busy || paused || status.coins < it.price * it.left} onClick={() => void buy(it.id, it.left)}>
                        {it.left}개 모두 · {formatNumber(it.price * it.left)} G
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
