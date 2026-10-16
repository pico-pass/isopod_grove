import type { DecorItem, SpeciesFamily } from '../api/types';

// 사육장 꾸미기 장식의 번식 보너스 계산. 서버(decor/decor.data.ts의 getDecorBreedBonusPercent)와 같은 규칙이어야 한다.
// 장식 목록(카탈로그)은 서버가 GET /decor로 내려주므로 계산식만 여기 있다.
export const DECOR_PROP_SLOTS = 4;

export const FAMILY_LABELS: Record<SpeciesFamily, { icon: string; name: string }> = {
  fire: { icon: '🔥', name: '불꽃' },
  forest: { icon: '🌿', name: '숲' },
  frost: { icon: '❄️', name: '서리' },
};

// 소품 칸 배열을 4칸으로 맞춘다(빈 칸·없는 장식·소품이 아닌 장식·이미 놓인 같은 소품은 '').
export function normalizeDecorProps(raw: readonly string[] | null | undefined, catalog: readonly DecorItem[]): string[] {
  const byId = new Map(catalog.map((d) => [d.decorId, d]));
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < DECOR_PROP_SLOTS; i++) {
    const id = raw?.[i] ?? '';
    const valid = byId.get(id)?.kind === 'prop' && !seen.has(id);
    out.push(valid ? id : '');
    if (valid) seen.add(id);
  }
  return out;
}

// 이 사육장의 장식이 같은 계열 종에게 주는 번식 속도 증가(%)
export function getDecorBreedBonusPercent(
  catalog: readonly DecorItem[],
  backdropId: string | null | undefined,
  propIds: readonly string[] | null | undefined,
  family: SpeciesFamily,
): number {
  const byId = new Map(catalog.map((d) => [d.decorId, d]));
  let percent = 0;
  const backdrop = backdropId ? byId.get(backdropId) : undefined;
  if (backdrop?.kind === 'backdrop' && backdrop.family === family) percent += backdrop.breedBonusPercent;
  for (const id of normalizeDecorProps(propIds, catalog)) {
    const prop = id ? byId.get(id) : undefined;
    if (prop?.family === family) percent += prop.breedBonusPercent;
  }
  return percent;
}
