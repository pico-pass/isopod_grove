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
  EQUIPMENT_SHARDS_PER_COPY,
  RARITIES,
  computeEquipmentBonuses,
  formatBonusPercent,
  formatNumber,
  getAwakenCost,
  getAwakenSuccessChance,
  getEquipmentBonus,
  getEquipmentLevelUpCopies,
  getEquipmentSetProgress,
  getShardLevelUpCost,
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
  onDismantle,
  onLevelUpShards,
}: {
  gameState: GameState;
  catalog: EquipmentCatalogItem[];
  showToast: (message: string, isError?: boolean) => void;
  onPull: (count: 1 | 10) => Promise<EquipmentPullResponse | null>;
  onLevelUp: (itemId: string) => Promise<unknown>;
  onAwaken: (itemId: string) => Promise<unknown>;
  onEquip: (slotIndex: number, itemId: string) => Promise<unknown>;
  onExpandSlot: () => Promise<unknown>;
  onDismantle: (itemId?: string, count?: number) => Promise<unknown>;
  onLevelUpShards: (itemId: string) => Promise<unknown>;
}) {
  const [tab, setTab] = useState<Tab>('gacha');
  const [pulling, setPulling] = useState(false);
  const [lastPull, setLastPull] = useState<EquipmentPullResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  const defOf = (itemId: string) => catalog.find((c) => c.equipmentId === itemId);
  const slots = gameState.equipmentSlots;
  const bonuses = computeEquipmentBonuses(slots, gameState.equipment, catalog);
  const shards = gameState.equipmentShards ?? 0;
  const setProgress = getEquipmentSetProgress(slots, gameState.equipment, catalog);
  const activeSets = setProgress.filter((s) => s.bonus > 0);

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

  // 장착하지 않은 장비의 중복(복사본)을 한꺼번에 분해하면 얻는 조각
  const bulkDismantle = owned
    .filter((e) => !slots.includes(e.itemId) && e.copies > 0)
    .reduce((sum, e) => sum + e.copies * EQUIPMENT_SHARDS_PER_COPY[defOf(e.itemId)!.rarity], 0);
  const dismantleOne = (state: EquipmentItemState) => {
    const def = defOf(state.itemId);
    if (!def) return;
    const gain = state.copies * EQUIPMENT_SHARDS_PER_COPY[def.rarity];
    if (!window.confirm(`${def.name}의 중복 ${state.copies}개를 분해해서 조각 ${gain}개를 얻을까요?\n분해한 장비는 되돌릴 수 없어요.`)) return;
    act(() => onDismantle(state.itemId));
  };
  const dismantleAll = () => {
    if (!window.confirm(`장착하지 않은 장비의 중복을 모두 분해해서 조각 ${formatNumber(bulkDismantle)}개를 얻을까요?\n분해한 장비는 되돌릴 수 없어요.`)) return;
    act(() => onDismantle());
  };

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
            {activeSets.length > 0 && (
              <>
                <br />
                🧩 세트 효과(모든 스탯){' '}
                {activeSets.map((s) => `${s.name} ${s.equipped}개 ${formatBonusPercent(s.bonus)}`).join(' · ')}
              </>
            )}
          </div>

          <p className="nav-caption">세트 효과</p>
          <div className="info-banner">
            같은 세트의 무기·방어구·장신구를 <b>2개</b> 또는 <b>3개</b> 장착하면 공격력·방어력·HP가 모두 올라요. 슬롯을 늘리면 한 세트를 맞추고
            다른 세트도 2개 끼울 수 있어요.
          </div>
          <div className="equip-set-grid">
            {[...setProgress]
              .sort((a, b) => b.rarity - a.rarity)
              .map((s) => (
                <div
                  key={s.setId}
                  className={`equip-set${s.bonus > 0 ? ' active' : ''}`}
                  style={{ borderColor: RARITIES[s.rarity].color }}
                >
                  <strong style={{ color: RARITIES[s.rarity].color }}>{s.name}</strong>
                  <span className="equip-set-items">
                    {s.itemIds.map((id) => {
                      const d = defOf(id);
                      const have = gameState.equipment.some((e) => e.itemId === id);
                      const on = slots.includes(id) && have;
                      return (
                        <span key={id} className={`equip-set-piece${on ? ' on' : have ? ' have' : ''}`} title={d?.name}>
                          {d?.icon}
                        </span>
                      );
                    })}
                  </span>
                  <small>
                    장착 {s.equipped}/3 · {s.bonus > 0 ? `지금 ${formatBonusPercent(s.bonus)}` : '효과 없음'}
                    {s.nextBonus !== null ? ` → ${s.equipped + 1}개 ${formatBonusPercent(s.nextBonus)}` : ' (최대)'}
                  </small>
                </div>
              ))}
          </div>

          <p className="nav-caption">
            보유 장비 · ✨ 장비 조각 {formatNumber(shards)}개
          </p>
          <div className="equip-shard-row">
            <small>
              쓰지 않는 중복 장비를 분해하면 조각을 얻고, 레벨업에 모자란 중복을 조각과 골드로 메꿀 수 있어요. 같은 장비를 직접 모으는 쪽이 늘 더
              이득이에요.
            </small>
            <button className="button secondary" disabled={busy || bulkDismantle < 1} onClick={dismantleAll}>
              중복 모두 분해 (장착 중 제외){bulkDismantle > 0 ? ` · +✨${formatNumber(bulkDismantle)}` : ''}
            </button>
          </div>
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
                  shards={shards}
                  busy={busy}
                  onEquip={() => equipToFirstEmpty(state.itemId)}
                  onLevelUp={() => act(() => onLevelUp(state.itemId))}
                  onLevelUpShards={() => act(() => onLevelUpShards(state.itemId))}
                  onDismantle={() => dismantleOne(state)}
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
  shards,
  busy,
  onEquip,
  onLevelUp,
  onLevelUpShards,
  onDismantle,
  onAwaken,
}: {
  state: EquipmentItemState;
  def: EquipmentCatalogItem;
  equipped: boolean;
  coins: number;
  shards: number;
  busy: boolean;
  onEquip: () => void;
  onLevelUp: () => void;
  onLevelUpShards: () => void;
  onDismantle: () => void;
  onAwaken: () => void;
}) {
  const info = EQUIPMENT_CATEGORY_INFO[def.category];
  const atMax = state.level >= state.maxLevel;
  const needed = getEquipmentLevelUpCopies(state.level);
  const canLevelUp = !atMax && state.copies >= needed;
  const shardCost = getShardLevelUpCost(def.rarity, state.level, state.copies);
  const canShardLevelUp = !atMax && shardCost.missing > 0 && shards >= shardCost.shards && coins >= shardCost.gold;
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
      <small>🧩 {def.setName}</small>
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
        {!atMax && shardCost.missing > 0 && (
          <button
            className="button secondary"
            disabled={busy || !canShardLevelUp}
            onClick={onLevelUpShards}
            title={`모자란 중복 ${shardCost.missing}개를 조각과 골드로 메꿔요`}
          >
            조각 레벨업 · ✨{formatNumber(shardCost.shards)} · {formatNumber(shardCost.gold)} G
          </button>
        )}
        {state.copies > 0 && (
          <button className="button secondary" disabled={busy} onClick={onDismantle}>
            중복 분해 · +✨{formatNumber(state.copies * EQUIPMENT_SHARDS_PER_COPY[def.rarity])}
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
