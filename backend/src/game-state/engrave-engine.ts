import { EQUIPMENT_BY_ID } from '../equipment/equipment.data';

// ---- 장비 각인 재련소 ----
// 장비는 능력치뿐이던 것에 "각인"이라는 특수 효과 한 줄을 새길 수 있다. 골드와 장비 조각을 내고 굴리면 무작위 각인(종류 + 등급)이 나오고,
// 마음에 들면 교체하고 아니면 버린다(기존 각인은 그대로). 원하는 옵션이 나올 때까지 계속 굴릴 수 있어서 소비처에 끝이 없다.
// 각인은 "장착 중인" 장비의 것만 효과가 있고, 같은 종류는 장착한 장비끼리 더해진다(종류마다 합계 상한이 있다).

export type EngraveKindId = 'matchup' | 'skillcd' | 'postheal' | 'xp';

export interface EngraveKind {
  id: EngraveKindId;
  name: string;
  icon: string;
  desc: string;
  unit: string; // 값 뒤에 붙는 단위
  values: readonly [number, number, number, number]; // 등급(일반·희귀·영웅·전설)별 값
  weight: number; // 종류가 뽑힐 비중
  cap: number; // 장착한 장비의 합계 상한
}

export const ENGRAVE_KINDS: readonly EngraveKind[] = [
  { id: 'matchup', name: '상성 연마', icon: '⚔️', desc: '계열 상성이 유리할 때 공격·방어 보정이 커져요(야생 배틀·보스 타워·던전).', unit: '%p', values: [1, 2, 3, 4], weight: 30, cap: 8 },
  { id: 'skillcd', name: '기술 단련', icon: '⏩', desc: '계열 기술의 쉬는 시간이 줄어요(직접 전투).', unit: '턴', values: [1, 1, 1, 2], weight: 20, cap: 3 },
  { id: 'postheal', name: '회복 각인', icon: '💗', desc: '던전에서 전투가 끝난 뒤 회복하는 비율이 늘어요.', unit: '%p', values: [3, 5, 8, 12], weight: 25, cap: 20 },
  { id: 'xp', name: '경험 각인', icon: '📘', desc: '전투 경험치가 늘어요.', unit: '%', values: [2, 3, 5, 8], weight: 25, cap: 30 },
];

export const ENGRAVE_GRADES = [
  { id: 'common', name: '일반', weight: 55 },
  { id: 'rare', name: '희귀', weight: 30 },
  { id: 'epic', name: '영웅', weight: 12 },
  { id: 'legend', name: '전설', weight: 3 },
] as const;

// 굴리는 데 드는 값: 장비 희귀도(0~4)마다. 한 번 굴릴 때마다 그대로 든다.
export const ENGRAVE_ROLL_GOLD: readonly number[] = [30_000, 100_000, 300_000, 1_000_000, 3_000_000];
export const ENGRAVE_ROLL_SHARDS: readonly number[] = [3, 8, 20, 50, 120];

export const findEngraveKind = (id: string): EngraveKind | undefined => ENGRAVE_KINDS.find((k) => k.id === id);

export function engraveRollCost(rarity: number): { gold: number; shards: number } {
  const r = Math.max(0, Math.min(4, Math.floor(rarity) || 0));
  return { gold: ENGRAVE_ROLL_GOLD[r], shards: ENGRAVE_ROLL_SHARDS[r] };
}

export interface EngraveRoll {
  kind: EngraveKindId;
  grade: number; // 0~3
}

// 난수 두 개(종류, 등급)로 각인 하나를 정한다. random은 [0, 1).
export function rollEngraving(random: () => number = Math.random): EngraveRoll {
  const kindTotal = ENGRAVE_KINDS.reduce((a, k) => a + k.weight, 0);
  let r = random() * kindTotal;
  let kind = ENGRAVE_KINDS[ENGRAVE_KINDS.length - 1];
  for (const k of ENGRAVE_KINDS) {
    r -= k.weight;
    if (r < 0) {
      kind = k;
      break;
    }
  }
  const gradeTotal = ENGRAVE_GRADES.reduce((a, g) => a + g.weight, 0);
  let g = random() * gradeTotal;
  let grade = ENGRAVE_GRADES.length - 1;
  for (let i = 0; i < ENGRAVE_GRADES.length; i++) {
    g -= ENGRAVE_GRADES[i].weight;
    if (g < 0) {
      grade = i;
      break;
    }
  }
  return { kind: kind.id, grade };
}

export function engraveValue(kind: string, grade: number): number {
  const k = findEngraveKind(kind);
  if (!k) return 0;
  return k.values[Math.max(0, Math.min(3, Math.floor(grade) || 0))];
}

export function engraveText(kind: string, grade: number): string {
  const k = findEngraveKind(kind);
  if (!k) return '';
  return `${k.icon} ${k.name} +${engraveValue(kind, grade)}${k.unit} (${ENGRAVE_GRADES[Math.max(0, Math.min(3, Math.floor(grade) || 0))].name})`;
}

export interface EngraveTotals {
  matchup: number; // 상성 유리 보정 +비율(0.04면 +4%p)
  skillCd: number; // 계열 기술 쉬는 시간 −턴
  postHeal: number; // 던전 전투 후 회복 +비율
  xp: number; // 전투 경험치 +비율
}
export const NO_ENGRAVE: EngraveTotals = { matchup: 0, skillCd: 0, postHeal: 0, xp: 0 };

interface EngravedItemLike {
  itemId: string;
  engraveKind?: string;
  engraveGrade?: number;
}

// 장착한 장비(같은 장비는 한 번만)의 각인을 모아 종류별 합계를 낸다. 장비 정의가 없는 id는 건너뛴다.
export function engraveTotals(slots: readonly string[] | undefined, items: readonly EngravedItemLike[] | undefined): EngraveTotals {
  const sum: Record<EngraveKindId, number> = { matchup: 0, skillcd: 0, postheal: 0, xp: 0 };
  const used = new Set<string>();
  for (const itemId of slots ?? []) {
    if (!itemId || used.has(itemId) || !EQUIPMENT_BY_ID.has(itemId)) continue;
    used.add(itemId);
    const it = (items ?? []).find((i) => i.itemId === itemId);
    if (!it?.engraveKind || !findEngraveKind(it.engraveKind)) continue;
    sum[it.engraveKind as EngraveKindId] += engraveValue(it.engraveKind, it.engraveGrade ?? 0);
  }
  const cap = (id: EngraveKindId) => Math.min(sum[id], findEngraveKind(id)!.cap);
  return { matchup: cap('matchup') / 100, skillCd: cap('skillcd'), postHeal: cap('postheal') / 100, xp: cap('xp') / 100 };
}
