import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ShopPlanItem, ShopProductId, ShopSimInfo, ShopSimRunResponse } from '../api/types';
import { formatDuration, formatNumber } from '../utils/gameCalc';

interface Draft {
  stock: number;
  price: number;
}

const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(v) ? Math.round(v) : min));

// 버섯 가게 운영: 오늘의 날씨를 보고 세 가지 버섯의 재고와 가격을 정해 하루 장사를 해요. 정식 영업은 하루 한 번(기록·보상·순위), 연습 영업은 무작위 하루로 마음껏 해 볼 수 있어요.
export function ShopSimView({
  onRun,
}: {
  onRun: (plan: ShopPlanItem[], practice: boolean) => Promise<ShopSimRunResponse | null>;
}) {
  const [info, setInfo] = useState<ShopSimInfo | null>(null);
  const [draft, setDraft] = useState<Record<ShopProductId, Draft> | null>(null);
  const [result, setResult] = useState<ShopSimRunResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        const data = await api.getShopSim();
        setInfo(data);
        setDraft(Object.fromEntries(data.products.map((p) => [p.id, { stock: 0, price: p.basePrice }])) as Record<ShopProductId, Draft>);
      } catch {
        // 못 불러오면 화면이 비어 보일 뿐이다. 새로고침으로 다시 시도할 수 있다.
      }
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const set = (id: ShopProductId, patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, [id]: { ...d[id], ...patch } } : d));

  const spend = info && draft ? info.products.reduce((s, p) => s + draft[p.id].stock * p.cost, 0) : 0;
  const overBudget = !!info && spend > info.budget;
  const played = info?.today.played === true;

  const run = async (practice: boolean) => {
    if (!info || !draft || busy) return;
    if (!practice && !window.confirm('오늘의 정식 영업은 하루 한 번만 할 수 있어요.\n이 계획으로 영업할까요?')) return;
    setBusy(true);
    try {
      const plan: ShopPlanItem[] = info.products.map((p) => ({ productId: p.id, stock: draft[p.id].stock, price: draft[p.id].price }));
      const r = await onRun(plan, practice);
      if (r) {
        setResult(r);
        if (!practice) setInfo(await api.getShopSim());
      }
    } finally {
      setBusy(false);
    }
  };

  const byId = new Map((info?.products ?? []).map((p) => [p.id, p]));

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MUSHROOM SHOP</p>
          <h1>
            버섯 가게 <span>{info ? `오늘 장사 초기화까지 ${formatDuration(Math.max(0, info.resetsAt - now))}` : ''}</span>
          </h1>
          <p className="subheading">오늘의 날씨를 보고 버섯 세 가지의 재고와 가격을 정해요. 손님은 가격이 오르면 줄고, 남은 재고는 상해서 버려져요.</p>
        </div>
      </div>

      {!info || !draft ? (
        <p className="empty">가게를 여는 중이에요…</p>
      ) : (
        <>
          <section className="panel shop-weather">
            <div className="panel-heading">
              <h2>
                {info.weather.icon} 오늘의 날씨: {info.weather.name}
              </h2>
              <span>밑천 {formatNumber(info.budget)}</span>
            </div>
            <p className="dungeon-sub">{info.weather.flavor} 날씨에 따라 버섯마다 손님 수가 달라져요(그날의 변동 ±10%는 직접 부딪혀 봐야 알아요).</p>
          </section>

          {played && info.today.played && (
            <section className="panel shop-played">
              <strong>
                ✅ 오늘의 정식 영업을 마쳤어요 · 최적의 {info.today.efficiency}% · 이익 {formatNumber(info.today.profit)}
                {info.today.rank ? ` · ${info.today.rank}위 / ${info.participants}명` : ''}
              </strong>
              <p className="dungeon-sub">연습 영업은 얼마든지 할 수 있어요(무작위 하루라 기록과 보상은 없어요). 내일 새 날씨로 다시 열어요.</p>
            </section>
          )}

          <div className="shop-products">
            {info.products.map((p) => {
              const d = draft[p.id];
              const pct = Math.round((p.weatherMult - 1) * 100);
              return (
                <section key={p.id} className="panel shop-product">
                  <div className="panel-heading">
                    <h2>
                      {p.icon} {p.name}
                    </h2>
                    <span>가격 민감도 {p.sensitivity}</span>
                  </div>
                  <p className="dungeon-sub">
                    원가 {p.cost} · 기준가 {p.basePrice} · 날씨 영향 {pct === 0 ? '없음' : `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%`} · 기준가일 때 손님 약 {p.expectedCustomers}명
                  </p>
                  <label className="shop-field">
                    판매 가격 <b>{formatNumber(d.price)}</b>
                    <input
                      type="range"
                      min={p.minPrice}
                      max={p.maxPrice}
                      step={1}
                      value={d.price}
                      disabled={busy}
                      aria-label={`${p.name} 판매 가격`}
                      onChange={(e) => set(p.id, { price: clampInt(Number(e.target.value), p.minPrice, p.maxPrice) })}
                    />
                    <small>
                      {p.minPrice} ~ {p.maxPrice}
                    </small>
                  </label>
                  <label className="shop-field">
                    준비할 개수 (비용 {formatNumber(d.stock * p.cost)})
                    <input
                      type="number"
                      min={0}
                      max={info.maxStock}
                      step={1}
                      value={d.stock}
                      disabled={busy}
                      aria-label={`${p.name} 준비 개수`}
                      onChange={(e) => set(p.id, { stock: clampInt(Number(e.target.value), 0, info.maxStock) })}
                    />
                  </label>
                </section>
              );
            })}
          </div>

          <section className="panel">
            <div className="shop-budget" role="status">
              <div className="hp-bar">
                <i style={{ width: `${Math.min(100, (spend / info.budget) * 100)}%`, background: overBudget ? 'var(--danger, #e57373)' : undefined }} />
              </div>
              <small className={overBudget ? 'shop-over' : ''}>
                준비 비용 {formatNumber(spend)} / 밑천 {formatNumber(info.budget)}
                {overBudget && ' — 밑천을 넘었어요!'}
              </small>
            </div>
            <div className="shop-actions">
              <button className="button secondary" disabled={busy || overBudget} onClick={() => void run(true)}>
                🧪 연습 영업 (무작위 하루)
              </button>
              <button className="button primary" disabled={busy || overBudget || played} onClick={() => void run(false)}>
                {played ? '오늘의 정식 영업은 끝났어요' : '🏪 오늘의 정식 영업 (하루 한 번)'}
              </button>
            </div>
          </section>

          {result && (
            <section className={`panel shop-result${result.practice ? ' practice' : ''}`}>
              <div className="panel-heading">
                <h2>
                  {result.practice ? '🧪 연습 결과' : '🏪 오늘의 영업 결과'} · {result.weather.icon} {result.weather.name}
                </h2>
                <span>
                  이익 {formatNumber(result.result.profit)} · 최적의 {result.efficiency}%
                </span>
              </div>
              <table className="shop-table">
                <thead>
                  <tr>
                    <th>버섯</th>
                    <th>손님</th>
                    <th>판매</th>
                    <th>버림</th>
                    <th>매출</th>
                    <th>원가</th>
                    <th>이익</th>
                  </tr>
                </thead>
                <tbody>
                  {result.result.lines.map((l) => (
                    <tr key={l.productId}>
                      <td>
                        {byId.get(l.productId)?.icon} {byId.get(l.productId)?.name} <small>({formatNumber(l.price)}×{formatNumber(l.stock)})</small>
                      </td>
                      <td>{formatNumber(l.customers)}</td>
                      <td>{formatNumber(l.sold)}</td>
                      <td>{formatNumber(l.wasted)}</td>
                      <td>{formatNumber(l.revenue)}</td>
                      <td>{formatNumber(l.cost)}</td>
                      <td className={l.profit < 0 ? 'shop-neg' : ''}>{formatNumber(l.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.reward && (
                <p className="battle-reward">
                  🎁 {result.reward.gold ? `${formatNumber(result.reward.gold)} G` : '보상 없음'}
                  {result.reward.explorationTickets ? ` · 🎟️ 탐색권 ${result.reward.explorationTickets}장` : ''}
                  {result.reward.diamonds ? ` · 💎 ${result.reward.diamonds}` : ''}
                  {result.rank ? ` · ${result.rank}위 / ${result.participants}명` : ''}
                </p>
              )}
              <details>
                <summary>이 날의 최적 계획 보기 (이익 {formatNumber(result.optimum.profit)})</summary>
                <ul className="puzzle-rewards">
                  {result.optimum.plan.map((p) => (
                    <li key={p.productId}>
                      {byId.get(p.productId)?.icon} {byId.get(p.productId)?.name}: 가격 {formatNumber(p.price)} · {formatNumber(p.stock)}개 준비
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}

          <section className="panel">
            <div className="panel-heading">
              <h2>🏆 오늘의 순위</h2>
              <span>{info.participants}명 영업</span>
            </div>
            {info.board.length === 0 ? (
              <p className="empty">아직 오늘 정식 영업을 한 사람이 없어요.</p>
            ) : (
              <div className="underdog-board">
                {info.board.map((row) => (
                  <div key={row.userId} className={`underdog-row shop-row${row.isMe ? ' me' : ''}`}>
                    <b>{row.rank}</b>
                    <span>{row.displayName}</span>
                    <span className="underdog-points">
                      {row.efficiency}% <small>이익 {formatNumber(row.profit)}</small>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="dungeon-sub">
              효율(그날 가장 잘 짠 계획 대비 이익)이 높은 순이에요. 보상은 닿은 단계를 모두 합쳐 받아요:{' '}
              {info.rewards.map((r) => `${r.efficiency}% ${formatNumber(r.gold)} G${r.explorationTickets ? ` + 🎟️${r.explorationTickets}` : ''}${r.diamonds ? ` + 💎${r.diamonds}` : ''}`).join(' · ')}
            </p>
          </section>
        </>
      )}
    </section>
  );
}
