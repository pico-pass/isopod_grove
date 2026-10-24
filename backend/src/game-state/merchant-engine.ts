import { DECOR_CATALOG } from '../decor/decor.data';
import { WEATHER_KINDS, type WeatherType } from '../weather/weather.data';
import { isSeasonalEventActive } from './event-engine';
import { seededRandom } from './dungeon-engine';
import { hashDay } from './wanted-engine';
import type { BoostKind } from './game-engine';

// ---- 떠돌이 상인 ----
// 매일 다른 한정 재고(탐색권·장비 조각·부스트·희귀 장식)를 파는 상인이 온다. 재고는 날짜로 정해져 모두 같고, 종류마다 하루에 살 수 있는 개수(한정)가 있어서 오늘 안 사면 사라진다.
// 가격은 그날의 달의 위상과 숲 날씨에 따라 종류마다 오르내린다(0.7~1.3배). 하루에 한 품목은 특가(−20%, 살 수 있는 개수 +1)다.

export type MerchantKind = 'ticket' | 'shard' | 'boost' | 'decor';

export interface MerchantLotDef {
  id: string; // 'ticket' | 'shard' | 'boost' | 'decor' (종류마다 한 칸)
  kind: MerchantKind;
  itemId: string; // 부스트 종류 또는 장식 id (나머지는 '')
  amount: number; // 한 번 사면 받는 양(탐색권 장수 · 조각 개수 · 부스트 시간 · 장식 1)
  limit: number; // 한 사람이 하루에 살 수 있는 개수
  sale: boolean; // 오늘의 특가
}

export const MERCHANT_TICKET_PRICE = 30_000; // 탐색권 1장의 기준 가격
export const MERCHANT_SHARD_PACK = 25; // 조각 한 묶음 개수
export const MERCHANT_SHARD_PACK_PRICE = 75_000;
export const MERCHANT_BOOST_HOURS = 2;
export const MERCHANT_DECOR_PRICE_RATE = 1.5; // 희귀 장식 = 상점가 × 이 값
export const MERCHANT_SALE_RATE = 0.8;
export const MERCHANT_PRICE_MIN = 0.7;
export const MERCHANT_PRICE_MAX = 1.3;
export const MERCHANT_LIMITS: Record<MerchantKind, number> = { ticket: 3, shard: 2, boost: 1, decor: 1 };
const KINDS: readonly MerchantKind[] = ['ticket', 'shard', 'boost', 'decor'];
const BOOST_KINDS: readonly BoostKind[] = ['income', 'breed', 'battleXp'];
const noonOf = (day: string) => Date.parse(`${day}T12:00:00+09:00`);

// 그 날짜의 재고 4칸. 같은 날짜는 항상 같다. 장식은 그날 이벤트 기간이 아닌 한정 장식 중에서 고른다(상점에서 못 사는 것).
export function merchantLotsFor(day: string): MerchantLotDef[] {
  const rng = seededRandom(hashDay(`merchant:${day}`), 97);
  const boost = BOOST_KINDS[Math.min(BOOST_KINDS.length - 1, Math.floor(rng() * BOOST_KINDS.length))];
  const limited = DECOR_CATALOG.filter((d) => d.eventId).sort((a, b) => a.decorId.localeCompare(b.decorId));
  const closed = limited.filter((d) => !isSeasonalEventActive(d.eventId as string, noonOf(day)));
  const pool = closed.length > 0 ? closed : limited;
  const decor = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  const saleKind = KINDS[Math.min(KINDS.length - 1, Math.floor(rng() * KINDS.length))];
  const itemOf: Record<MerchantKind, string> = { ticket: '', shard: '', boost, decor: decor.decorId };
  const amountOf: Record<MerchantKind, number> = { ticket: 1, shard: MERCHANT_SHARD_PACK, boost: MERCHANT_BOOST_HOURS, decor: 1 };
  return KINDS.map((kind) => ({ id: kind, kind, itemId: itemOf[kind], amount: amountOf[kind], limit: MERCHANT_LIMITS[kind] + (kind === saleKind ? 1 : 0), sale: kind === saleKind }));
}

// ---- 달의 위상 ----
const SYNODIC_DAYS = 29.530588853;
const NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC 신월
export const MOON_PHASES = [
  { name: '신월', icon: '🌑' },
  { name: '초승달', icon: '🌒' },
  { name: '상현달', icon: '🌓' },
  { name: '차오르는 달', icon: '🌔' },
  { name: '보름달', icon: '🌕' },
  { name: '기우는 달', icon: '🌖' },
  { name: '하현달', icon: '🌗' },
  { name: '그믐달', icon: '🌘' },
] as const;

// 그 날짜(한국 시간 정오 기준)의 달: fraction 0=신월, 0.5=보름
export function moonPhase(day: string): { fraction: number; index: number; name: string; icon: string } {
  const age = (((noonOf(day) - NEW_MOON_MS) / 86_400_000) % SYNODIC_DAYS + SYNODIC_DAYS) % SYNODIC_DAYS;
  const fraction = age / SYNODIC_DAYS;
  const index = Math.floor(fraction * 8 + 0.5) % 8;
  return { fraction, index, name: MOON_PHASES[index].name, icon: MOON_PHASES[index].icon };
}

// 종류마다 값이 가장 비싸지는 달의 위상(0=신월, 0.5=보름)
const MOON_PEAK: Record<MerchantKind, number> = { ticket: 0.5, shard: 0, boost: 0.25, decor: 0.75 };
const MOON_AMPLITUDE = 0.12;

const WEATHER_MULT: Record<WeatherType, Record<MerchantKind, number>> = {
  clear: { ticket: 1.08, shard: 1, boost: 1.1, decor: 1 },
  cloudy: { ticket: 1, shard: 1, boost: 1, decor: 1 },
  rain: { ticket: 0.92, shard: 0.95, boost: 1, decor: 1.1 },
  storm: { ticket: 0.95, shard: 0.9, boost: 1.08, decor: 1.1 },
  snow: { ticket: 1, shard: 1.08, boost: 0.95, decor: 0.9 },
  heat: { ticket: 1.05, shard: 0.95, boost: 1.1, decor: 0.95 },
  cold: { ticket: 1, shard: 1.1, boost: 0.92, decor: 0.9 },
};

// 그날의 달과 날씨가 정하는 가격 배율(특가 전). 날씨 정보가 없으면 달만 따른다.
export function merchantPriceMultiplier(kind: MerchantKind, moonFraction: number, weather: WeatherType | null | undefined): number {
  const moon = 1 + MOON_AMPLITUDE * Math.cos(2 * Math.PI * (moonFraction - MOON_PEAK[kind]));
  const wx = weather && WEATHER_MULT[weather] ? WEATHER_MULT[weather][kind] : 1;
  return Math.max(MERCHANT_PRICE_MIN, Math.min(MERCHANT_PRICE_MAX, moon * wx));
}

// 기준 가격(배율 전). 부스트는 내 시간당 최대 수익으로, 장식은 상점가로 정한다.
export function merchantBasePrice(def: MerchantLotDef, ctx: { boostHourPrice: number; decorPrice: number }): number {
  if (def.kind === 'ticket') return MERCHANT_TICKET_PRICE * def.amount;
  if (def.kind === 'shard') return MERCHANT_SHARD_PACK_PRICE;
  if (def.kind === 'boost') return ctx.boostHourPrice * def.amount;
  return Math.round(ctx.decorPrice * MERCHANT_DECOR_PRICE_RATE);
}

// 최종 가격: 기준 × 배율 × (특가면 0.8), 100 G 단위로 반올림
export function merchantPrice(base: number, multiplier: number, sale: boolean): number {
  return Math.max(100, Math.round((base * multiplier * (sale ? MERCHANT_SALE_RATE : 1)) / 100) * 100);
}

export function weatherName(type: WeatherType | null | undefined): { name: string; icon: string } | null {
  return type && WEATHER_KINDS[type] ? { name: WEATHER_KINDS[type].name, icon: WEATHER_KINDS[type].icon } : null;
}
