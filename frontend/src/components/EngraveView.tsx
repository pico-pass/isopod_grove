import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { EngraveResponse, EngraveStatus } from '../api/types';
import { formatNumber } from '../utils/gameCalc';

const RARITY_NAMES = ['일반', '희귀', '에픽', '전설', '신화'];
const CATEGORY_NAMES = { weapon: '무기', armor: '방어구', charm: '장신구' } as const;

// 장비 각인 재련소: 장비마다 특수 효과 한 줄(각인)을 새겨요. 골드와 장비 조각으로 굴려서 마음에 들면 교체하고, 아니면 버리면 기존 각인이 그대로예요.
// 각인은 장착 중인 장비의 것만 효과가 있어요.
export function EngraveView({
  coins,
  paused,
  onRoll,
  onAccept,
  onDiscard,
}: {
  coins: number;
  paused: boolean;
  onRoll: (itemId: string) => Promise<EngraveResponse | null>;
  onAccept: (itemId: string) => Promise<EngraveResponse | null>;
  onDiscard: (itemId: string) => Promise<EngraveResponse | null>;
}) {
  const [status, setStatus] = useState<EngraveStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getEngrave());
      } catch {
        setFailed(true);
      }
    });
  }, []);

  const run = async (fn: () => Promise<EngraveResponse | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      if (r) setStatus(r.status);
    } finally {
      setBusy(false);
    }
  };

  const totals = status?.totals;
  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ENGRAVING FORGE</p>
          <h1>
            장비 각인 재련소 <span>조각 {status ? formatNumber(status.shards) : '…'}개 · {formatNumber(coins)} G</span>
          </h1>
          <p className="subheading">장비에 특수 효과 한 줄을 새겨요. 굴려서 나온 새 각인이 마음에 들면 교체하고, 아니면 버리면 기존 각인이 그대로예요. 원하는 각인이 나올 때까지 몇 번이고 굴릴 수 있어요.</p>
        </div>
      </div>
      {failed && <p className="empty">재련소 정보를 불러오지 못했어요. 새로고침으로 다시 시도해 주세요.</p>}
      {!status && !failed && <p className="empty">재련소를 여는 중이에요…</p>}
      {status && totals && (
        <>
          <section className="panel engrave-summary">
            <div className="panel-heading">
              <h2>🔥 지금 적용 중인 각인 효과</h2>
              <span className="pill">장착한 장비만</span>
            </div>
            <ul className="engrave-totals">
              <li className={totals.matchup > 0 ? 'on' : ''}>⚔️ 상성 연마 +{Math.round(totals.matchup * 100)}%p</li>
              <li className={totals.skillCd > 0 ? 'on' : ''}>⏩ 기술 단련 −{totals.skillCd}턴</li>
              <li className={totals.postHeal > 0 ? 'on' : ''}>💗 회복 각인 +{Math.round(totals.postHeal * 100)}%p</li>
              <li className={totals.xp > 0 ? 'on' : ''}>📘 경험 각인 +{Math.round(totals.xp * 100)}%</li>
            </ul>
            <details className="engrave-kinds">
              <summary>각인 종류와 값 보기</summary>
              <ul>
                {status.kinds.map((k) => (
                  <li key={k.id}>
                    <b>
                      {k.icon} {k.name}
                    </b>{' '}
                    — {k.desc} 값: {status.grades.map((g, i) => `${g.name} ${k.values[i]}${k.unit}`).join(' · ')} (장착 합계 상한 {k.cap}
                    {k.unit}) · 등급 확률 {status.grades.map((g) => `${g.name} ${g.rate}%`).join(' · ')}
                  </li>
                ))}
              </ul>
            </details>
          </section>

          {status.items.length === 0 && <p className="empty">아직 가진 장비가 없어요. 장비를 얻으면 각인을 새길 수 있어요.</p>}
          <div className="engrave-items">
            {status.items.map((it) => {
              const enough = status.shards >= it.cost.shards && coins >= it.cost.gold;
              return (
                <section key={it.itemId} className={`panel engrave-item rarity-${it.rarity}${it.equipped ? ' equipped' : ''}`}>
                  <div className="engrave-head">
                    <span className="engrave-icon" aria-hidden="true">{it.icon}</span>
                    <div>
                      <h3>{it.name}</h3>
                      <span className="pill">
                        {RARITY_NAMES[it.rarity]} {CATEGORY_NAMES[it.category]}
                        {it.equipped ? ' · 장착 중' : ''}
                      </span>
                    </div>
                  </div>
                  <p className="engrave-current">{it.current ? <>현재 각인 <b>{it.current.text}</b></> : '새겨진 각인이 없어요.'}</p>
                  {it.pending && (
                    <div className="engrave-pending">
                      <p>
                        새 각인 <b>{it.pending.text}</b>
                      </p>
                      <div className="engrave-actions">
                        <button className="button primary" disabled={busy || paused} onClick={() => void run(() => onAccept(it.itemId))}>
                          교체하기
                        </button>
                        <button className="button secondary" disabled={busy || paused} onClick={() => void run(() => onDiscard(it.itemId))}>
                          버리기
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    className="button secondary full"
                    disabled={busy || paused || !enough}
                    title={enough ? undefined : '골드나 조각이 부족해요'}
                    onClick={() => void run(() => onRoll(it.itemId))}
                  >
                    🎲 {it.pending ? '다시 굴리기' : it.current ? '다른 각인 굴리기' : '각인 굴리기'} · {formatNumber(it.cost.gold)} G · 조각 {it.cost.shards}개
                  </button>
                </section>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
