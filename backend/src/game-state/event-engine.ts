import type { SpeciesFamily } from '../species/species.family';
import { WEATHER_EXPLORE_WEIGHT, type FamilyWeights } from '../weather/weather.data';
import { getPuzzleDayKey } from './puzzle-engine';

// ---- 절기·명절 한정 이벤트 ----
// 실제 달력(한국 시간)의 명절·절기에 맞춰 열린다. 이벤트 기간에는
//   ① 그 이벤트가 편드는 계열 종이 숲 탐색·원정에서 SEASONAL_EXPLORE_WEIGHT배 더 잘 나오고(날씨 효과와 곱해진다),
//   ② 한정 장식(decor.data.ts의 eventId)을 살 수 있고(산 장식은 계정에 영구히 남는다),
//   ③ 이벤트마다 한 해에 한 번 선물을 받을 수 있다.
// 날짜는 DB에 두지 않고 이 코드의 규칙으로 계산한다. 설날·추석은 음력이라 Intl의 중국력으로 그해의 양력 날짜를 구한다(±1일 오차가 날 수 있어
// 기간에 앞뒤 여유를 둔다). 중국력을 쓸 수 없는 환경이면 음력 이벤트는 열리지 않는다.

export const SEASONAL_EXPLORE_WEIGHT = 2;
export interface SeasonalGift {
  gold: number;
  diamonds: number;
  tickets: number;
}
export const SEASONAL_GIFT: SeasonalGift = { gold: 30_000, diamonds: 3, tickets: 2 };

interface FixedRule {
  from: string; // 'MM-DD'
  to: string; // 'MM-DD' (같은 해 안, 끝 날짜 포함)
}
interface LunarRule {
  month: number; // 음력 월·일(윤달은 세지 않는다)
  day: number;
  before: number; // 그날 며칠 전부터
  after: number; // 그날 며칠 뒤까지
  search: FixedRule; // 그 음력 날짜가 들어 있는 양력 구간
}
export interface SeasonalEventDef {
  id: string;
  name: string;
  icon: string;
  family: SpeciesFamily;
  flavor: string;
  fixed?: FixedRule;
  lunar?: LunarRule;
}

export const SEASONAL_EVENTS: readonly SeasonalEventDef[] = [
  { id: 'seollal', name: '설날', icon: '🧧', family: 'frost', flavor: '새해 첫 눈이 소복이 쌓인 숲에서 복을 나눠요.', lunar: { month: 1, day: 1, before: 3, after: 2, search: { from: '01-10', to: '03-05' } } },
  { id: 'blossom', name: '벚꽃철', icon: '🌸', family: 'forest', flavor: '벚꽃잎이 흩날리는 숲길이 열렸어요.', fixed: { from: '03-28', to: '04-10' } },
  { id: 'monsoon', name: '장마철', icon: '☔', family: 'forest', flavor: '장맛비에 숲이 한껏 푸르러졌어요.', fixed: { from: '06-24', to: '07-25' } },
  { id: 'chuseok', name: '추석', icon: '🌕', family: 'fire', flavor: '한가위 보름달 아래 송편 냄새가 퍼져요.', lunar: { month: 8, day: 15, before: 3, after: 2, search: { from: '08-25', to: '10-20' } } },
  { id: 'halloween', name: '할로윈', icon: '🎃', family: 'fire', flavor: '으스스한 호박등이 숲을 밝혀요.', fixed: { from: '10-18', to: '10-31' } },
  { id: 'christmas', name: '크리스마스', icon: '🎄', family: 'frost', flavor: '눈 내리는 숲에 반짝이는 트리가 섰어요.', fixed: { from: '12-18', to: '12-26' } },
];

const DEF_BY_ID = new Map(SEASONAL_EVENTS.map((e) => [e.id, e]));
export const findSeasonalEvent = (id: string): SeasonalEventDef | undefined => DEF_BY_ID.get(id);

// 'YYYY-MM-DD'에 일수를 더하거나 뺀다
export function addDays(dateKey: string, days: number): string {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

const lunarFormat = (() => {
  try {
    return new Intl.DateTimeFormat('en-u-ca-chinese', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' });
  } catch {
    return null;
  }
})();

const lunarCache = new Map<string, string | null>();
// 그해 양력 구간에서 음력 month/day(윤달 제외)에 해당하는 날짜. 못 구하면 null.
export function lunarToSolar(year: number, month: number, day: number, search: FixedRule): string | null {
  const cacheKey = `${year}-${month}-${day}-${search.from}-${search.to}`;
  if (lunarCache.has(cacheKey)) return lunarCache.get(cacheKey) ?? null;
  let found: string | null = null;
  if (lunarFormat) {
    try {
      for (let d = `${year}-${search.from}`; d <= `${year}-${search.to}`; d = addDays(d, 1)) {
        const parts = lunarFormat.formatToParts(new Date(`${d}T12:00:00+09:00`));
        const m = Number(parts.find((p) => p.type === 'month')?.value); // 윤달은 '6bis'처럼 나와 NaN이다
        const dd = Number(parts.find((p) => p.type === 'day')?.value);
        if (m === month && dd === day) {
          found = d;
          break;
        }
      }
    } catch {
      found = null;
    }
  }
  lunarCache.set(cacheKey, found);
  return found;
}

// 그해의 이벤트 기간(양끝 포함). 계산할 수 없으면 null.
export function seasonalEventRange(def: SeasonalEventDef, year: number): { from: string; to: string } | null {
  if (def.fixed) return { from: `${year}-${def.fixed.from}`, to: `${year}-${def.fixed.to}` };
  if (def.lunar) {
    const center = lunarToSolar(year, def.lunar.month, def.lunar.day, def.lunar.search);
    if (!center) return null;
    return { from: addDays(center, -def.lunar.before), to: addDays(center, def.lunar.after) };
  }
  return null;
}

export interface SeasonalEventStatus {
  id: string;
  name: string;
  icon: string;
  family: SpeciesFamily;
  flavor: string;
  from: string;
  to: string;
}

const statusOf = (def: SeasonalEventDef, range: { from: string; to: string }): SeasonalEventStatus => ({
  id: def.id,
  name: def.name,
  icon: def.icon,
  family: def.family,
  flavor: def.flavor,
  from: range.from,
  to: range.to,
});

export function seasonalToday(now = Date.now()): string {
  return getPuzzleDayKey(now);
}

// 지금 열려 있는 이벤트(기간이 겹치면 여럿일 수 있다)
export function activeSeasonalEvents(now = Date.now()): SeasonalEventStatus[] {
  const today = seasonalToday(now);
  const year = Number(today.slice(0, 4));
  const out: SeasonalEventStatus[] = [];
  for (const def of SEASONAL_EVENTS) {
    const range = seasonalEventRange(def, year);
    if (range && today >= range.from && today <= range.to) out.push(statusOf(def, range));
  }
  return out;
}

export function isSeasonalEventActive(id: string, now = Date.now()): boolean {
  return activeSeasonalEvents(now).some((e) => e.id === id);
}

// 아직 열리지 않은 이벤트를 열리는 순서대로(올해 기간이 이미 끝났으면 내년 기간으로)
export function upcomingSeasonalEvents(now = Date.now(), limit = SEASONAL_EVENTS.length): (SeasonalEventStatus & { daysUntil: number })[] {
  const today = seasonalToday(now);
  const year = Number(today.slice(0, 4));
  const out: (SeasonalEventStatus & { daysUntil: number })[] = [];
  for (const def of SEASONAL_EVENTS) {
    for (const y of [year, year + 1]) {
      const range = seasonalEventRange(def, y);
      if (range && range.from > today) {
        out.push({ ...statusOf(def, range), daysUntil: daysBetween(today, range.from) });
        break;
      }
    }
  }
  return out.sort((a, b) => a.from.localeCompare(b.from)).slice(0, limit);
}

// 한 해에 한 번 받는 선물의 기록용 id (예: 'chuseok-2026')
export function seasonalGiftId(eventId: string, now = Date.now()): string {
  return `${eventId}-${seasonalToday(now).slice(0, 4)}`;
}

// 탐색·원정에서 계열마다 곱해지는 가중치: 날씨가 편드는 계열(×2)과 열려 있는 이벤트가 편드는 계열(각 ×2)이 곱해진다.
// extras는 그 밖의 가중치(예: 오늘의 운세의 행운 계열)로, 각각 해당 계열에 곱해진다.
export function exploreFamilyWeights(weatherFamily: SpeciesFamily | null, events: readonly { family: SpeciesFamily }[], extras: readonly { family: SpeciesFamily; mult: number }[] = []): FamilyWeights {
  const weights: FamilyWeights = {};
  if (weatherFamily) weights[weatherFamily] = WEATHER_EXPLORE_WEIGHT;
  for (const e of events) weights[e.family] = (weights[e.family] ?? 1) * SEASONAL_EXPLORE_WEIGHT;
  for (const x of extras) weights[x.family] = (weights[x.family] ?? 1) * x.mult;
  return weights;
}
