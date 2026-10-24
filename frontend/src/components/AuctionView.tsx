import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AuctionResponse, AuctionStatus } from '../api/types';
import { formatDuration, formatNumber } from '../utils/gameCalc';

const MINE_LABEL = { leading: '🏆 내가 최고가', outbid: '😢 밀렸어요', none: '' } as const;

// 매일 경매: 서버가 매일 희귀한 물건 3개를 올려요. 골드로 입찰하면 그 자리에서 보관되고, 밀리면 돌려받아요. 자정에 마감해 최고가가 낙찰돼요.
export function AuctionView({
  coins,
  paused,
  onBid,
  onClaim,
}: {
  coins: number;
  paused: boolean;
  onBid: (lot: number, amount: number) => Promise<AuctionResponse | null>;
  onClaim: () => Promise<AuctionResponse | null>;
}) {
  const [status, setStatus] = useState<AuctionStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  // 물건마다 입력 중인 입찰액(비어 있으면 최소 입찰가)
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getAuction());
      } catch {
        setFailed(true);
      }
    });
  }, []);

  // 입찰이 거절되면(밀림·골드 부족 등) 최신 상태를 다시 불러와 바뀐 최고가를 보여 준다.
  const refresh = async () => {
    try {
      setStatus(await api.getAuction());
    } catch {
      // 다음 새로고침 때 다시 시도한다
    }
  };

  const run = async (fn: () => Promise<AuctionResponse | null>, resetLot?: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      if (r) {
        setStatus(r.status);
        // 입찰이 받아들여지면 입력칸을 새 최소 입찰가로 되돌린다
        if (resetLot !== undefined) setAmounts((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => Number(k) !== resetLot)));
      } else await refresh();
    } finally {
      setBusy(false);
    }
  };

  const pending = status?.pending;
  const hasPending = !!pending && (pending.refund > 0 || pending.won.length > 0);

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DAILY AUCTION</p>
          <h1>
            매일 경매 <span>보유 {formatNumber(coins)} G</span>
          </h1>
          <p className="subheading">매일 올라오는 희귀한 물건에 골드로 입찰해요. 입찰금은 바로 보관되고, 더 높은 입찰에 밀리면 돌려받아요. 입찰가는 모두에게 공개돼요.</p>
        </div>
      </div>
      {failed && <p className="empty">경매 정보를 불러오지 못했어요. 새로고침으로 다시 시도해 주세요.</p>}
      {!status && !failed && <p className="empty">경매장을 여는 중이에요…</p>}
      {status && (
        <>
          <p className="auction-clock">⏰ 오늘 경매는 자정에 마감돼요 — 남은 시간 {formatDuration(status.endsInMs / 1000)}</p>

          {hasPending && pending && (
            <section className="panel auction-pending">
              <div className="panel-heading">
                <h2>📦 받을 것</h2>
                <button className="button primary" disabled={busy || paused} onClick={() => void run(onClaim)}>
                  모두 받기
                </button>
              </div>
              <ul>
                {pending.refund > 0 && <li>💰 밀려서 돌아온 입찰금 {formatNumber(pending.refund)} G</li>}
                {pending.won.map((w) => (
                  <li key={`${w.day}-${w.lot}`}>
                    🏆 {w.icon} {w.name} <small>({formatNumber(w.amount)} G에 낙찰)</small>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="auction-lots">
            {status.lots.map((l) => {
              const raw = amounts[l.lot];
              const value = raw === undefined ? l.nextMin : Number(raw);
              const tooLow = !Number.isFinite(value) || value < l.nextMin;
              const need = value - l.myBid;
              return (
                <section key={l.lot} className={`panel auction-lot kind-${l.kind}${l.mine === 'leading' ? ' leading' : ''}`}>
                  <div className="auction-head">
                    <span className="auction-icon" aria-hidden="true">{l.icon}</span>
                    <div>
                      <h3>{l.name}</h3>
                      <span className="pill">{l.tag}</span>
                    </div>
                  </div>
                  <p className="auction-desc">{l.description}</p>
                  <p className="auction-price">
                    {l.top ? (
                      <>
                        현재 최고가 <b>{formatNumber(l.top.amount)} G</b> · {l.top.displayName}
                        {l.top.isMe ? '(나)' : ''} · 입찰 {l.bids}회
                      </>
                    ) : (
                      <>
                        아직 입찰이 없어요 · 시작가 <b>{formatNumber(l.minBid)} G</b>
                      </>
                    )}
                  </p>
                  {l.mine !== 'none' && <p className={`auction-mine ${l.mine}`}>{MINE_LABEL[l.mine]}</p>}
                  {l.alreadyOwned ? (
                    <p className="auction-note">이미 가지고 있는 장식이라 입찰할 수 없어요.</p>
                  ) : (
                    <div className="auction-bid">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={l.nextMin}
                        step={1000}
                        value={raw ?? String(l.nextMin)}
                        aria-label={`${l.name} 입찰액`}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [l.lot]: e.target.value }))}
                      />
                      <button className="button secondary" onClick={() => setAmounts((prev) => ({ ...prev, [l.lot]: String(l.nextMin) }))}>
                        최소 {formatNumber(l.nextMin)}
                      </button>
                      <button
                        className="button primary"
                        disabled={busy || paused || tooLow || need > coins + (pending?.refund ?? 0)}
                        onClick={() => void run(() => onBid(l.lot, value), l.lot)}
                        title={tooLow ? `${formatNumber(l.nextMin)} G 이상이어야 해요` : need > coins + (pending?.refund ?? 0) ? '골드가 부족해요' : undefined}
                      >
                        {l.mine === 'leading' ? '입찰가 올리기' : '입찰'}
                      </button>
                    </div>
                  )}
                  {!l.alreadyOwned && !tooLow && <p className="auction-note">이번에 보관되는 골드 {formatNumber(Math.max(0, need))} G (밀리면 돌려받아요)</p>}
                  {l.history.length > 0 && (
                    <ul className="auction-history">
                      {l.history.slice(0, 5).map((h, i) => (
                        <li key={`${h.at}-${i}`} className={h.isMe ? 'me' : ''}>
                          <span>{h.displayName}</span>
                          <b>{formatNumber(h.amount)} G</b>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          {status.yesterday && (
            <section className="panel">
              <div className="panel-heading">
                <h2>📜 어제의 낙찰 결과</h2>
              </div>
              <ul className="auction-results">
                {status.yesterday.lots.map((r) => (
                  <li key={r.lot}>
                    <span>
                      {r.icon} {r.name}
                    </span>
                    <span>{r.winner ? `${r.winner.displayName}${r.winner.isMe ? '(나)' : ''} · ${formatNumber(r.winner.amount)} G` : '유찰'}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}
