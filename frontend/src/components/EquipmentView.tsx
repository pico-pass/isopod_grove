import { useState } from 'react';
import type {
  EquipmentCatalogItem,
  EquipmentItemState,
  EquipmentPullResponse,
  EquipmentPullResult,
  GameState,
} from '../api/types';
import {
  EQUIPMENT_AWAKEN_LEVEL_GAIN,
  EQUIPMENT_CATEGORY_INFO,
  EQUIPMENT_MAX_AWAKENINGS,
  EQUIPMENT_MAX_SLOTS,
  EQUIPMENT_PITY_LIMIT,
  EQUIPMENT_PULL10_COST,
  EQUIPMENT_PULL_COST,
  EQUIPMENT_PULL_ODDS,
  EQUIPMENT_SLOT_EXPAND_COSTS,
  EQUIPMENT_BASE_SLOTS,
  RARITIES,
  computeEquipmentBonuses,
  formatBonusPercent,
  formatNumber,
  getAwakenCost,
  getAwakenSuccessChance,
  getEquipmentBonus,
  getEquipmentLevelUpCopies,
} from '../utils/gameCalc';

type Tab = 'gacha' | 'inventory';

export function EquipmentView({
  gameState,
  catalog,
  showToast,
  onPull,
  onLevelUp,
  onAwaken,
  onEquip,
  onExpandSlot,
}: {
  gameState: GameState;
  catalog: EquipmentCatalogItem[];
  showToast: (message: string, isError?: boolean) => void;
  onPull: (count: 1 | 10) => Promise<EquipmentPullResponse | null>;
  onLevelUp: (itemId: string) => Promise<unknown>;
  onAwaken: (itemId: string) => Promise<unknown>;
  onEquip: (slotIndex: number, itemId: string) => Promise<unknown>;
  onExpandSlot: () => Promise<unknown>;
}) {
  const [tab, setTab] = useState<Tab>('gacha');
  const [pulling, setPulling] = useState(false);
  const [lastPull, setLastPull] = useState<EquipmentPullResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  const defOf = (itemId: string) => catalog.find((c) => c.equipmentId === itemId);
  const slots = gameState.equipmentSlots;
  const bonuses = computeEquipmentBonuses(slots, gameState.equipment, catalog);

  const pull = async (count: 1 | 10) => {
    if (pulling) return;
    setPulling(true);
    const r = await onPull(count);
    if (r) setLastPull(r.results);
    setPulling(false);
  };

  // 한 번에 하나의 동작만 보내서 연타로 상태가 엇갈리지 않게 한다.
  const act = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    await fn();
    setBusy(false);
  };

  const equipToFirstEmpty = (itemId: string) => {
    const empty = slots.findIndex((s) => !s);
    if (empty < 0) {
      showToast('빈 슬롯이 없어요. 슬롯에서 장비를 해제하거나 슬롯을 확장해 주세요.', true);
      return;
    }
    act(() => onEquip(empty, itemId));
  };

  const owned = [...gameState.equipment]
    .filter((e) => defOf(e.itemId))
    .sort((a, b) => {
      const da = defOf(a.itemId)!;
      const db = defOf(b.itemId)!;
      return db.rarity - da.rarity || catalog.indexOf(da) - catalog.indexOf(db);
    });

  const nextExpandCost =
    slots.length < EQUIPMENT_MAX_SLOTS ? EQUIPMENT_SLOT_EXPAND_COSTS[slots.length - EQUIPMENT_BASE_SLOTS] : null;

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FOREST GEAR</p>
          <h1>
            장비 <span>{owned.length} / {catalog.length}종 보유</span>
          </h1>
          <p className="subheading">
            숲에서 주운 장비를 장착하면 야생 배틀과 투기장에서 스탯이 올라가요.
          </p>
        </div>
      </div>

      <div className="filter-row">
        <button className={`filter${tab === 'gacha' ? ' active' : ''}`} onClick={() => setTab('gacha')}>
          🎁 장비 뽑기
        </button>
        <button className={`filter${tab === 'inventory' ? ' active' : ''}`} onClick={() => setTab('inventory')}>
          🎒 보관함 · 장착
        </button>
      </div>

      {tab === 'gacha' ? (
        <>
          <div className="info-banner">
            💎 다이아로 장비를 뽑아요. 같은 장비를 또 뽑으면 레벨업 재료(중복)로 쌓여요.
            전설 이상이 <b>{EQUIPMENT_PITY_LIMIT}회</b> 연속으로 안 나오면 {EQUIPMENT_PITY_LIMIT}번째는 확정이에요
            (천장까지 {Math.max(0, EQUIPMENT_PITY_LIMIT - gameState.equipmentPity)}회).
          </div>

          <div className="equip-pull-row">
            <button
              className="button primary"
              disabled={pulling || gameState.diamonds < EQUIPMENT_PULL_COST}
              onClick={() => pull(1)}
            >
              1회 뽑기 · 💎{EQUIPMENT_PULL_COST}
            </button>
            <button
              className="button primary"
              disabled={pulling || gameState.diamonds < EQUIPMENT_PULL10_COST}
              onClick={() => pull(10)}
            >
              10연차 · 💎{EQUIPMENT_PULL10_COST}
              <small> (희귀 이상 1개 보장)</small>
            </button>
          </div>

          <p className="nav-caption">뽑기 확률</p>
          <div className="equip-odds">
            {RARITIES.map((r, i) => (
              <span key={r.name} style={{ color: r.color }}>
                {r.name} {EQUIPMENT_PULL_ODDS[i]}%
              </span>
            ))}
          </div>

          {lastPull && (
            <>
              <p className="nav-caption">뽑기 결과</p>
              <div className="equip-grid">
                {lastPull.map((r, i) => {
                  const def = defOf(r.itemId);
                  if (!def) return null;
                  return (
                    <div
                      key={i}
                      className="equip-card result"
                      style={{ borderColor: RARITIES[def.rarity].color }}
                    >
                      <span className="equip-icon">{def.icon}</span>
                      <strong>{def.name}</strong>
                      <span className="pill" style={{ color: RARITIES[def.rarity].color }}>
                        {RARITIES[def.rarity].name} · {EQUIPMENT_CATEGORY_INFO[def.category].label}
                      </span>
                      <small>{r.isNew ? '✨ NEW' : `중복 +1 (보유 ${r.copies}개)`}</small>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <p className="nav-caption">장착 슬롯 ({slots.length}/{EQUIPMENT_MAX_SLOTS})</p>
          <div className="equip-slot-row">
            {Array.from({ length: EQUIPMENT_MAX_SLOTS }, (_, i) => {
              if (i < slots.length) {
                const def = slots[i] ? defOf(slots[i]) : undefined;
                const state = slots[i] ? gameState.equipment.find((e) => e.itemId === slots[i]) : undefined;
                return (
                  <div
                    key={i}
                    className={`equip-slot${def ? ' filled' : ''}`}
                    style={def ? { borderColor: RARITIES[def.rarity].color } : undefined}
                  >
                    {def && state ? (
                      <>
                        <span className="equip-icon">{def.icon}</span>
                        <strong>{def.name}</strong>
                        <small>
                          Lv.{state.level} · {EQUIPMENT_CATEGORY_INFO[def.category].statLabel}{' '}
                          {formatBonusPercent(getEquipmentBonus(def.rarity, state.level, state.awakenCount))}
                        </small>
                        <button className="button secondary" disabled={busy} onClick={() => act(() => onEquip(i, ''))}>
                          해제
                        </button>
                      </>
                    ) : (
                      <small>빈 슬롯</small>
                    )}
                  </div>
                );
              }
              const isNext = i === slots.length && nextExpandCost !== null;
              return (
                <div key={i} className="equip-slot locked">
                  <span>🔒</span>
                  {isNext ? (
                    <button
                      className="button secondary"
                      disabled={busy || gameState.diamonds < nextExpandCost}
                      onClick={() => act(onExpandSlot)}
                    >
                      확장 · 💎{formatNumber(nextExpandCost)}
                    </button>
                  ) : (
                    <small>앞 슬롯을 먼저 확장</small>
                  )}
                </div>
              );
            })}
          </div>

          <div className="info-banner">
            장착 보너스 합계 — ⚔️ 공격력 {formatBonusPercent(bonuses.atk)} · 🛡️ 방어력{' '}
            {formatBonusPercent(bonuses.def)} · ❤️ HP {formatBonusPercent(bonuses.hp)}
          </div>

          <p className="nav-caption">보유 장비</p>
          {owned.length === 0 ? (
            <p className="empty">아직 장비가 없어요. 장비 뽑기에서 첫 장비를 얻어 보세요!</p>
          ) : (
            <div className="equip-grid">
              {owned.map((state) => (
                <InventoryCard
                  key={state.itemId}
                  state={state}
                  def={defOf(state.itemId)!}
                  equipped={slots.includes(state.itemId)}
                  coins={gameState.coins}
                  busy={busy}
                  onEquip={() => equipToFirstEmpty(state.itemId)}
                  onLevelUp={() => act(() => onLevelUp(state.itemId))}
                  onAwaken={() => act(() => onAwaken(state.itemId))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function InventoryCard({
  state,
  def,
  equipped,
  coins,
  busy,
  onEquip,
  onLevelUp,
  onAwaken,
}: {
  state: EquipmentItemState;
  def: EquipmentCatalogItem;
  equipped: boolean;
  coins: number;
  busy: boolean;
  onEquip: () => void;
  onLevelUp: () => void;
  onAwaken: () => void;
}) {
  const info = EQUIPMENT_CATEGORY_INFO[def.category];
  const atMax = state.level >= state.maxLevel;
  const needed = getEquipmentLevelUpCopies(state.level);
  const canLevelUp = !atMax && state.copies >= needed;
  const canAwakenMore = state.awakenCount < EQUIPMENT_MAX_AWAKENINGS;
  const awakenCost = getAwakenCost(def.rarity, state.awakenCount);
  const awakenChance = Math.round(getAwakenSuccessChance(state.awakenFailures) * 100);

  return (
    <div className={`equip-card${equipped ? ' equipped' : ''}`} style={{ borderColor: RARITIES[def.rarity].color }}>
      <span className="equip-icon">{def.icon}</span>
      <strong>{def.name}</strong>
      <span className="pill" style={{ color: RARITIES[def.rarity].color }}>
        {RARITIES[def.rarity].name} · {info.label}
      </span>
      <small>
        {info.icon} {info.statLabel} {formatBonusPercent(getEquipmentBonus(def.rarity, state.level, state.awakenCount))}
      </small>
      <small>
        Lv.{state.level} / {state.maxLevel}
        {state.awakenCount > 0 ? ` · 각성 ${state.awakenCount}회` : ''}
      </small>
      {atMax ? (
        <small className="equip-max">최대 레벨{canAwakenMore ? ' — 각성 가능' : ' (각성 한도)'}</small>
      ) : (
        <>
          <div className="mini-xp-bar">
            <i style={{ width: `${Math.min(100, (state.copies / needed) * 100)}%` }} />
          </div>
          <small>
            중복 {state.copies} / {needed}
          </small>
        </>
      )}
      <div className="equip-actions">
        {equipped ? (
          <span className="equip-badge">장착 중</span>
        ) : (
          <button className="button secondary" disabled={busy} onClick={onEquip}>
            장착
          </button>
        )}
        {!atMax && (
          <button className="button primary" disabled={busy || !canLevelUp} onClick={onLevelUp}>
            레벨업
          </button>
        )}
        {atMax && canAwakenMore && (
          <button className="button primary" disabled={busy || coins < awakenCost} onClick={onAwaken}>
            각성 · {formatNumber(awakenCost)} G ({awakenChance}%)
          </button>
        )}
      </div>
      {atMax && canAwakenMore && (
        <small className="equip-hint">
          성공 시 최대 Lv +{EQUIPMENT_AWAKEN_LEVEL_GAIN}, 효과 +5% · 실패하면 다음 확률 +5%p
        </small>
      )}
    </div>
  );
}
