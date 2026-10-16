import { SPECIES_FAMILIES, type SpeciesFamily } from '../species/species.family';

// 사육장 꾸미기 장식 카탈로그. 장식은 DB에 저장하지 않고 이 코드가 기준이다(GET /decor로 프론트에 내려준다).
//   - 배경(backdrop): 사육장마다 하나. 사육장 바닥 분위기를 바꾼다.
//   - 소품(prop): 사육장마다 DECOR_PROP_SLOTS칸. 같은 소품을 한 사육장에 두 개 놓을 수는 없다.
// 한 번 사면 계정에 영구히 남고, 어느 사육장에든 몇 번이고 옮겨 놓을 수 있다(무료).
// 계열 장식은 그 사육장에 사는 같은 계열 종의 번식 진행을 빠르게 한다. 계열 없는 장식은 꾸미기 전용이다.

export type DecorKind = 'backdrop' | 'prop';
export type DecorTier = 0 | 1 | 2; // 일반 / 희귀 / 에픽

export const DECOR_PROP_SLOTS = 4;
export const DECOR_TIER_NAMES = ['일반', '희귀', '에픽'] as const;

// 등급별 값(계열 장식 기준). 계열 없는 장식은 번식 보너스가 없고 값이 절반이다.
const BACKDROP_PRICE: readonly number[] = [10_000, 100_000, 2_000_000];
const PROP_PRICE: readonly number[] = [4_000, 40_000, 600_000];
const BACKDROP_BONUS_PERCENT: readonly number[] = [2, 4, 6];
const PROP_BONUS_PERCENT: readonly number[] = [1, 2, 3];
const NEUTRAL_PRICE_RATE = 0.5;

const FAMILY_NAMES: Record<SpeciesFamily, string> = { fire: '불꽃', forest: '숲', frost: '서리' };

export interface DecorItem {
  decorId: string;
  kind: DecorKind;
  name: string;
  icon: string;
  tier: DecorTier;
  family: SpeciesFamily | null;
  price: number;
  // 같은 계열 종의 번식 진행 속도 증가(%). 계열 없는 장식은 0.
  breedBonusPercent: number;
  description: string;
  // 배경만: 사육장 사진 위에 덮는 그라데이션 색(위쪽, 아래쪽)
  tint?: [string, string];
}

function item(
  kind: DecorKind,
  decorId: string,
  name: string,
  icon: string,
  tier: DecorTier,
  family: SpeciesFamily | null,
  tint?: [string, string],
): DecorItem {
  const basePrice = (kind === 'backdrop' ? BACKDROP_PRICE : PROP_PRICE)[tier];
  const bonus = family ? (kind === 'backdrop' ? BACKDROP_BONUS_PERCENT : PROP_BONUS_PERCENT)[tier] : 0;
  return {
    decorId,
    kind,
    name,
    icon,
    tier,
    family,
    price: family ? basePrice : Math.round(basePrice * NEUTRAL_PRICE_RATE),
    breedBonusPercent: bonus,
    description: family ? `${FAMILY_NAMES[family]} 계열 번식 +${bonus}%` : '꾸미기 전용',
    ...(tint ? { tint } : {}),
  };
}

export const DECOR_CATALOG: readonly DecorItem[] = [
  // 배경 — 숲
  item('backdrop', 'moss-floor', '이끼 바닥', '🌿', 0, 'forest', ['rgba(110,170,80,0.35)', 'rgba(40,90,50,0.35)']),
  item('backdrop', 'deep-forest', '울창한 숲속', '🌲', 1, 'forest', ['rgba(40,110,60,0.45)', 'rgba(10,50,30,0.5)']),
  item('backdrop', 'elder-tree', '고목의 뿌리', '🌳', 2, 'forest', ['rgba(90,70,30,0.45)', 'rgba(20,60,30,0.55)']),
  // 배경 — 불꽃
  item('backdrop', 'warm-sand', '따뜻한 모래', '🏜️', 0, 'fire', ['rgba(230,190,110,0.35)', 'rgba(190,130,60,0.35)']),
  item('backdrop', 'volcanic-cave', '화산 동굴', '🌋', 1, 'fire', ['rgba(190,70,40,0.4)', 'rgba(60,20,20,0.55)']),
  item('backdrop', 'lava-field', '용암 지대', '🔥', 2, 'fire', ['rgba(255,110,30,0.5)', 'rgba(120,20,10,0.6)']),
  // 배경 — 서리
  item('backdrop', 'snow-patch', '눈 쌓인 흙', '❄️', 0, 'frost', ['rgba(220,235,245,0.35)', 'rgba(150,190,220,0.35)']),
  item('backdrop', 'glacier-cave', '빙하 동굴', '🧊', 1, 'frost', ['rgba(120,200,240,0.4)', 'rgba(30,70,120,0.5)']),
  item('backdrop', 'aurora-field', '오로라 설원', '🌌', 2, 'frost', ['rgba(90,240,180,0.4)', 'rgba(110,70,220,0.5)']),
  // 배경 — 꾸미기 전용
  item('backdrop', 'night-garden', '달빛 정원', '🌙', 1, null, ['rgba(40,50,110,0.5)', 'rgba(10,15,50,0.6)']),
  item('backdrop', 'sunset-glade', '노을 진 공터', '🌇', 1, null, ['rgba(255,150,90,0.4)', 'rgba(150,60,110,0.45)']),
  item('backdrop', 'starry-night', '별빛 밤하늘', '✨', 2, null, ['rgba(30,20,90,0.55)', 'rgba(5,5,30,0.65)']),
  // 소품 — 숲
  item('prop', 'wildflower', '들꽃', '🌼', 0, 'forest'),
  item('prop', 'mossy-log', '이끼 낀 통나무', '🪵', 1, 'forest'),
  item('prop', 'forest-fairy', '숲의 요정상', '🧚', 2, 'forest'),
  // 소품 — 불꽃
  item('prop', 'warm-stone', '따뜻한 돌', '🪨', 0, 'fire'),
  item('prop', 'ember-candle', '불씨 양초', '🕯️', 1, 'fire'),
  item('prop', 'mini-volcano', '작은 화산 모형', '🌋', 2, 'fire'),
  // 소품 — 서리
  item('prop', 'ice-chunk', '얼음 조각', '🧊', 0, 'frost'),
  item('prop', 'snowman', '눈사람', '⛄', 1, 'frost'),
  item('prop', 'frost-crystal', '서리 수정', '🔮', 2, 'frost'),
  // 소품 — 꾸미기 전용
  item('prop', 'clay-pot', '도자기 항아리', '🏺', 0, null),
  item('prop', 'tiny-ladder', '작은 사다리', '🪜', 0, null),
  item('prop', 'lantern', '작은 등불', '🏮', 1, null),
  item('prop', 'mini-castle', '미니 성', '🏰', 2, null),
];

const DECOR_BY_ID = new Map(DECOR_CATALOG.map((d) => [d.decorId, d]));

export const findDecor = (decorId: string): DecorItem | undefined => DECOR_BY_ID.get(decorId);

// 소품 칸 배열을 DECOR_PROP_SLOTS칸으로 맞춘다(빈 칸·없는 장식·소품이 아닌 장식·이미 놓인 같은 소품은 ''). 옛 사육장은 필드가 없을 수 있다.
export function normalizeDecorProps(raw: readonly string[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < DECOR_PROP_SLOTS; i++) {
    const id = raw?.[i] ?? '';
    const valid = findDecor(id)?.kind === 'prop' && !seen.has(id);
    out.push(valid ? id : '');
    if (valid) seen.add(id);
  }
  return out;
}

// 이 사육장의 장식이 같은 계열 종에게 주는 번식 속도 증가(%). 배경과 소품의 보너스를 더한다.
export function getDecorBreedBonusPercent(
  backdropId: string | null | undefined,
  propIds: readonly string[] | null | undefined,
  family: SpeciesFamily,
): number {
  let percent = 0;
  const backdrop = backdropId ? findDecor(backdropId) : undefined;
  if (backdrop?.kind === 'backdrop' && backdrop.family === family) percent += backdrop.breedBonusPercent;
  for (const id of normalizeDecorProps(propIds)) {
    const prop = id ? findDecor(id) : undefined;
    if (prop?.family === family) percent += prop.breedBonusPercent;
  }
  return percent;
}

// 계열별 번식 진행 배율(1 + 증가율). 번식 진행 시간에 곱한다.
export function getDecorBreedFactors(
  backdropId: string | null | undefined,
  propIds: readonly string[] | null | undefined,
): Record<SpeciesFamily, number> {
  const factors = {} as Record<SpeciesFamily, number>;
  for (const family of SPECIES_FAMILIES) {
    factors[family] = 1 + getDecorBreedBonusPercent(backdropId, propIds, family) / 100;
  }
  return factors;
}
