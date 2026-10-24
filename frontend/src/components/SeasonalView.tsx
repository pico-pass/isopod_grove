import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { SeasonalGiftResponse, SeasonalStatus } from '../api/types';
import { FAMILY_LABELS } from '../utils/decor';
import { formatNumber } from '../utils/gameCalc';

const TIER_NAMES = ['일반', '희귀', '에픽'];
const STATE_LABEL = { past: '지났어요', active: '진행 중', upcoming: '예정' } as const;

// 'YYYY-MM-DD' → 'M월 D일'
function md(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

// 계절 이벤트: 실제 달력의 명절·절기에 열려요. 기간에는 이벤트 계열 종이 탐색에서 더 잘 나오고, 한정 장식을 살 수 있고, 선물을 받을 수 있어요.
export function SeasonalView({
  coins,
  paused,
  onGift,
  onBuyDecor,
}: {
  coins: number;
  paused: boolean;
  onGift: (eventId: string) => Promise<SeasonalGiftResponse | null>;
  onBuyDecor: (decorId: string) => Promise<unknown>;
}) {
  const [status, setStatus] = useState<SeasonalStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getSeasonal());
      } catch {
        setFailed(true);
      }
    });
  }, []);

  const gift = async (eventId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await onGift(eventId);
      if (r) setStatus(r.status);
    } finally {
      setBusy(false);
    }
  };

  const buy = async (decorId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await onBuyDecor(decorId);
      setStatus(await api.getSeasonal());
    } catch {
      // 구매 실패 안내는 onBuyDecor(runAction)가 알려 준다
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SEASONAL EVENTS</p>
          <h1>계절 이벤트</h1>
          <p className="subheading">실제 달력의 명절·절기에 열려요. 이벤트 기간에는 이벤트 계열 종이 탐색에서 더 잘 나오고, 기간 한정 장식을 살 수 있어요.</p>
        </div>
      </div>
      {failed && <p className="empty">이벤트 정보를 불러오지 못했어요. 새로고침으로 다시 시도해 주세요.</p>}
      {!status && !failed && <p className="empty">달력을 넘겨 보는 중이에요…</p>}
      {status && (
        <>
          {status.active.length === 0 && (
            <section className="panel">
              <p className="empty">지금은 열려 있는 이벤트가 없어요.{status.upcoming[0] && ` 다음은 ${status.upcoming[0].icon} ${status.upcoming[0].name}(${md(status.upcoming[0].from)}~)이에요.`}</p>
            </section>
          )}
          {status.active.map((e) => (
            <section key={e.id} className={`panel seasonal-event family-${e.family}`}>
              <div className="panel-heading">
                <h2>
                  {e.icon} {e.name}
                </h2>
                <span className="pill">
                  {md(e.from)} ~ {md(e.to)} · {e.daysLeft}일 남음
                </span>
              </div>
              <p className="seasonal-flavor">{e.flavor}</p>
              <p className="seasonal-effect">
                {FAMILY_LABELS[e.family].icon} 숲 탐색·원정에서 같은 등급 안의 <b>{FAMILY_LABELS[e.family].name} 계열</b> 종이 ×{e.exploreWeight} 더 잘 나와요(날씨가 같은 계열을 편들면 곱해져요).
              </p>
              <div className="seasonal-gift">
                <span>
                  🎁 올해 선물 <b>{e.giftText}</b>
                </span>
                <button className="button primary" disabled={busy || paused || e.giftClaimed} onClick={() => void gift(e.id)}>
                  {e.giftClaimed ? '올해 선물 받음' : '선물 받기'}
                </button>
              </div>
              <h3 className="seasonal-sub">🎫 기간 한정 장식</h3>
              <ul className="seasonal-decor">
                {e.decor.map((d) => (
                  <li key={d.decorId} className={`tier-${d.tier}`}>
                    <span className="seasonal-decor-icon">{d.icon}</span>
                    <span className="seasonal-decor-info">
                      <strong>{d.name}</strong>
                      <small>
                        {d.kind === 'backdrop' ? '배경' : '소품'} · {TIER_NAMES[d.tier]} · {d.description}
                      </small>
                    </span>
                    <button className="button secondary" disabled={busy || paused || d.owned || coins < d.price} onClick={() => void buy(d.decorId)} title={coins < d.price && !d.owned ? '골드가 부족해요' : undefined}>
                      {d.owned ? '보유 중' : `${formatNumber(d.price)} G`}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="seasonal-note">산 장식은 계정에 남아서 기간이 지나도 사육장 꾸미기에서 놓을 수 있어요.</p>
            </section>
          ))}

          <section className="panel">
            <div className="panel-heading">
              <h2>📅 올해 일정</h2>
              <span className="pill">
                한정 장식 {status.ownedLimited} / {status.totalLimited}
              </span>
            </div>
            <ul className="seasonal-calendar">
              {status.calendar.map((c) => (
                <li key={c.id} className={c.state}>
                  <span>
                    {c.icon} {c.name}
                  </span>
                  <span>
                    {md(c.from)} ~ {md(c.to)}
                  </span>
                  <span>
                    {FAMILY_LABELS[c.family].icon} {FAMILY_LABELS[c.family].name}
                  </span>
                  <span className="seasonal-state">{STATE_LABEL[c.state]}</span>
                </li>
              ))}
            </ul>
            {status.upcoming.length > 0 && (
              <p className="seasonal-note">
                곧 열려요: {status.upcoming.map((u) => `${u.icon} ${u.name} ${u.daysUntil}일 뒤`).join(' · ')}
              </p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
