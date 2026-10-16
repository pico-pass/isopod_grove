import { useState } from 'react';
import type { DecorItem, GameState, Terrarium } from '../api/types';
import { DECOR_PROP_SLOTS, FAMILY_LABELS, getDecorBreedBonusPercent, normalizeDecorProps } from '../utils/decor';
import { formatNumber } from '../utils/gameCalc';
import { TerrariumDecorLayer } from './TerrariumDecorLayer';

type Slot = { kind: 'backdrop' } | { kind: 'prop'; index: number };

const TIER_CLASS = ['common', 'rare', 'epic'];

// 사육장 꾸미기 창: 칸(배경 1 + 소품 4)을 고르고, 산 장식은 놓고, 안 산 장식은 골드로 산다.
export function DecorModal({
  gameState,
  terrarium,
  catalog,
  tierNames,
  onBuy,
  onPlace,
  onSetPublic,
  onVisitMine,
  onClose,
}: {
  gameState: GameState;
  terrarium: Terrarium;
  catalog: DecorItem[];
  tierNames: string[];
  onBuy: (decorId: string) => Promise<unknown>;
  onPlace: (kind: 'backdrop' | 'prop', index: number | undefined, decorId?: string) => Promise<unknown>;
  onSetPublic: (isPublic: boolean) => Promise<unknown>;
  onVisitMine: () => void;
  onClose: () => void;
}) {
  const [slot, setSlot] = useState<Slot>({ kind: 'backdrop' });
  const [busy, setBusy] = useState(false);

  const owned = new Set(gameState.decorOwned ?? []);
  const props = normalizeDecorProps(terrarium.decorProps, catalog);
  const backdropId = catalog.find((d) => d.decorId === terrarium.decorBackdrop && d.kind === 'backdrop')?.decorId ?? '';
  const byId = new Map(catalog.map((d) => [d.decorId, d]));
  const isPublic = gameState.terrariumPublic !== false;

  const currentIdOf = (s: Slot) => (s.kind === 'backdrop' ? backdropId : props[s.index]);
  const currentId = currentIdOf(slot);
  const items = catalog
    .filter((d) => d.kind === slot.kind)
    .sort((a, b) => Number(owned.has(b.decorId)) - Number(owned.has(a.decorId)) || a.tier - b.tier || a.name.localeCompare(b.name, 'ko'));

  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  const place = (item: DecorItem | null) =>
    run(() => onPlace(slot.kind, slot.kind === 'prop' ? slot.index : undefined, item?.decorId));

  const bonusLine = (['fire', 'forest', 'frost'] as const).map((family) => ({
    family,
    percent: getDecorBreedBonusPercent(catalog, terrarium.decorBackdrop, props, family),
  }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card decor-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="꾸미기 닫기">
          ×
        </button>
        <h2>🎨 사육장 꾸미기</h2>
        <p className="decor-sub">
          “{terrarium.name}”을 꾸며요. 산 장식은 어느 사육장에든 무료로 옮겨 놓을 수 있어요.
        </p>

        <div className="terrarium decor-preview">
          <img className="terrain-image" src="/assets/terrarium.webp" alt="" />
          <div className="terrain-shade" />
          <TerrariumDecorLayer catalog={catalog} backdropId={backdropId} propIds={props} />
        </div>

        <div className="decor-bonus" aria-label="번식 보너스">
          {bonusLine.map(({ family, percent }) => (
            <span key={family} className={percent > 0 ? 'on' : undefined}>
              {FAMILY_LABELS[family].icon} {FAMILY_LABELS[family].name} 번식 {percent > 0 ? `+${percent}%` : '—'}
            </span>
          ))}
        </div>

        <div className="decor-slots" role="tablist" aria-label="꾸밀 칸">
          {[{ kind: 'backdrop' } as Slot, ...Array.from({ length: DECOR_PROP_SLOTS }, (_, i) => ({ kind: 'prop', index: i }) as Slot)].map((s) => {
            const id = currentIdOf(s);
            const item = id ? byId.get(id) : undefined;
            const active = s.kind === slot.kind && (s.kind === 'backdrop' || (slot.kind === 'prop' && s.index === slot.index));
            return (
              <button
                key={s.kind === 'backdrop' ? 'backdrop' : `prop-${s.index}`}
                role="tab"
                aria-selected={active}
                className={`decor-slot${active ? ' active' : ''}`}
                onClick={() => setSlot(s)}
              >
                <b>{item ? item.icon : '＋'}</b>
                <small>{s.kind === 'backdrop' ? '배경' : `소품 ${s.index + 1}`}</small>
              </button>
            );
          })}
        </div>

        <div className="decor-list">
          {items.map((d) => {
            const have = owned.has(d.decorId);
            const here = currentId === d.decorId;
            const otherSlot = slot.kind === 'prop' && props.some((id, i) => id === d.decorId && i !== slot.index);
            return (
              <div key={d.decorId} className={`decor-item tier-${TIER_CLASS[d.tier]}${here ? ' placed' : ''}`}>
                <span className="decor-item-icon">{d.icon}</span>
                <span className="decor-item-info">
                  <strong>{d.name}</strong>
                  <small>
                    {tierNames[d.tier]} · {d.family ? `${FAMILY_LABELS[d.family].icon} ${d.description}` : d.description}
                  </small>
                </span>
                {have ? (
                  here ? (
                    <button className="decor-btn" disabled={busy || gameState.paused} onClick={() => void place(null)}>
                      치우기
                    </button>
                  ) : (
                    <button className="decor-btn primary" disabled={busy || gameState.paused || otherSlot} onClick={() => void place(d)}>
                      {otherSlot ? '다른 칸에 있어요' : '놓기'}
                    </button>
                  )
                ) : (
                  <button
                    className="decor-btn buy"
                    disabled={busy || gameState.paused || gameState.coins < d.price}
                    onClick={() => void run(() => onBuy(d.decorId))}
                    title={gameState.coins < d.price ? '골드가 부족해요' : undefined}
                  >
                    {formatNumber(d.price)} G
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="decor-footer">
          <label className="decor-public">
            <input type="checkbox" checked={isPublic} disabled={busy} onChange={(e) => void run(() => onSetPublic(e.target.checked))} />
            다른 숲지기가 내 사육장을 구경할 수 있어요
          </label>
          <button className="decor-btn" onClick={onVisitMine}>
            🏡 남들에게 보이는 모습 · 받은 좋아요
          </button>
        </div>
      </div>
    </div>
  );
}
