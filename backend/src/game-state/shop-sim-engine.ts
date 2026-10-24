import { WEATHER_KINDS, type WeatherType } from '../weather/weather.data';
import { seededRandom } from './dungeon-engine';
import { hashDay } from './wanted-engine';

// ---- 버섯 가게 운영 ----
// 하루 장사를 계획하는 경영 미니게임이다. 버섯 세 가지에 대해 "몇 개를 준비하고(재고), 얼마에 팔지(가격)"를 정하면, 서버가 그날의
// 손님 수(날씨·가격에 따라 달라진다)를 계산해서 팔린 만큼 매출을 계산하고 남은 재고는 버려진다(상한다). 준비하는 데는 밑천(예산)이 든다.
// 그날의 조건(날씨·손님 변동)은 모두에게 같아서, 점수는 "가장 잘 짰을 때 이익 대비 몇 %를 벌었는가(효율)"로 정한다.
// 가격이 오르면 손님이 줄고(가격 민감도), 재고는 손님 수만큼만 팔린다. 모든 계산은 서버에서 한다.
export type ShopProductId = 'shiitake' | 'oyster' | 'matsutake';

export interface ShopProduct {
  id: ShopProductId;
  name: string;
  icon: string;
  cost: number; // 한 개 준비하는 값(원가)
  basePrice: number; // 기준 판매가
  baseDemand: number; // 기준 판매가에서 날씨 영향이 없을 때의 하루 손님 수
  elasticity: number; // 가격 민감도: 손님 수 ∝ (기준가 / 가격)^elasticity
  sensitivity: string; // 화면에 보이는 민감도 설명
}

export const SHOP_PRODUCTS: readonly ShopProduct[] = [
  { id: 'shiitake', name: '표고버섯', icon: '🍄', cost: 20, basePrice: 40, baseDemand: 60, elasticity: 1.6, sensitivity: '보통' },
  { id: 'oyster', name: '느타리버섯', icon: '🍲', cost: 12, basePrice: 25, baseDemand: 90, elasticity: 2.2, sensitivity: '민감' },
  { id: 'matsutake', name: '송이버섯', icon: '✨', cost: 60, basePrice: 180, baseDemand: 20, elasticity: 1.25, sensitivity: '둔함' },
];
export const findShopProduct = (id: string): ShopProduct | undefined => SHOP_PRODUCTS.find((p) => p.id === id);

export const SHOP_BUDGET = 2500; // 준비하는 데 쓸 수 있는 밑천(원가 × 개수의 합 상한)
export const SHOP_PRICE_MIN_RATE = 0.5; // 판매가는 기준가의 50%~250% 안에서 정한다
export const SHOP_PRICE_MAX_RATE = 2.5;
export const SHOP_MAX_STOCK = 500;
export const SHOP_PRICE_GRID_STEP = 0.05; // 최적 계획을 찾을 때 훑는 가격 간격(기준가의 5%)

// 날씨가 손님 수에 곱하는 배율(상품마다)
export const SHOP_WEATHER_MULT: Record<WeatherType, Record<ShopProductId, number>> = {
  clear: { shiitake: 1.0, oyster: 1.0, matsutake: 1.25 },
  cloudy: { shiitake: 1.0, oyster: 1.1, matsutake: 1.0 },
  rain: { shiitake: 1.3, oyster: 1.1, matsutake: 0.8 },
  storm: { shiitake: 0.8, oyster: 0.8, matsutake: 0.7 },
  snow: { shiitake: 1.2, oyster: 1.2, matsutake: 1.0 },
  heat: { shiitake: 0.85, oyster: 0.8, matsutake: 0.7 },
  cold: { shiitake: 1.25, oyster: 1.3, matsutake: 1.1 },
};

export interface ShopEnv {
  weather: WeatherType;
  noise: Record<ShopProductId, number>; // 그날 상품마다 손님 수가 0.9~1.1배로 달라진다
}

const IDS = SHOP_PRODUCTS.map((p) => p.id);

function noiseFrom(random: () => number): Record<ShopProductId, number> {
  const n = {} as Record<ShopProductId, number>;
  for (const id of IDS) n[id] = Math.round((0.9 + random() * 0.2) * 1000) / 1000;
  return n;
}

// 그날의 조건: 날씨는 그날 처음 정해진 값을 쓰고, 손님 변동은 날짜에서 정한다(모두에게 같다).
export function shopEnvForDay(dayKey: string, weather: WeatherType): ShopEnv {
  return { weather, noise: noiseFrom(seededRandom(hashDay(dayKey), 3, 61)) };
}

// 연습 영업: 날씨·변동이 무작위인 가상의 하루(기록·보상 없음)
export function randomShopEnv(random: () => number = Math.random): ShopEnv {
  const types = Object.keys(WEATHER_KINDS) as WeatherType[];
  return { weather: types[Math.min(types.length - 1, Math.floor(random() * types.length))], noise: noiseFrom(random) };
}

export const shopPriceRange = (p: ShopProduct) => ({ min: Math.round(p.basePrice * SHOP_PRICE_MIN_RATE), max: Math.round(p.basePrice * SHOP_PRICE_MAX_RATE) });

// 이 가격에서 그날 오는 손님 수(소수). 기준가보다 비싸면 줄고 싸면 는다.
export function shopDemand(product: ShopProduct, price: number, env: ShopEnv): number {
  return product.baseDemand * SHOP_WEATHER_MULT[env.weather][product.id] * env.noise[product.id] * Math.pow(product.basePrice / price, product.elasticity);
}
export const shopCustomers = (product: ShopProduct, price: number, env: ShopEnv): number => Math.max(0, Math.round(shopDemand(product, price, env)));

export interface ShopPlanItem {
  productId: ShopProductId;
  stock: number;
  price: number;
}

export interface ShopLine {
  productId: ShopProductId;
  stock: number;
  price: number;
  customers: number;
  sold: number;
  wasted: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ShopResult {
  lines: ShopLine[];
  revenue: number;
  cost: number;
  profit: number;
}

// 계획 검사: 세 상품이 한 번씩, 재고는 0~상한의 정수, 가격은 범위 안의 정수, 준비 비용 합이 예산 이내. 문제가 있으면 이유를, 없으면 null.
export function validateShopPlan(plan: unknown): string | null {
  if (!Array.isArray(plan) || plan.length !== SHOP_PRODUCTS.length) return '세 가지 버섯의 계획을 모두 보내 주세요.';
  const seen = new Set<string>();
  let spend = 0;
  for (const item of plan as Partial<ShopPlanItem>[]) {
    const product = item && typeof item.productId === 'string' ? findShopProduct(item.productId) : undefined;
    if (!product || seen.has(product.id)) return '알 수 없거나 겹치는 버섯이 있어요.';
    seen.add(product.id);
    const { stock, price } = item;
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0 || stock > SHOP_MAX_STOCK) return `${product.name} 재고는 0~${SHOP_MAX_STOCK}개의 정수여야 해요.`;
    const range = shopPriceRange(product);
    if (typeof price !== 'number' || !Number.isInteger(price) || price < range.min || price > range.max) return `${product.name} 가격은 ${range.min}~${range.max} 사이의 정수여야 해요.`;
    spend += stock * product.cost;
  }
  if (spend > SHOP_BUDGET) return `준비 비용이 예산 ${SHOP_BUDGET.toLocaleString('ko-KR')}을 넘었어요. (지금 ${spend.toLocaleString('ko-KR')})`;
  return null;
}

export function runShopDay(env: ShopEnv, plan: readonly ShopPlanItem[]): ShopResult {
  const lines: ShopLine[] = SHOP_PRODUCTS.map((product) => {
    const item = plan.find((p) => p.productId === product.id)!;
    const customers = shopCustomers(product, item.price, env);
    const sold = Math.min(item.stock, customers);
    const revenue = sold * item.price;
    const cost = item.stock * product.cost;
    return { productId: product.id, stock: item.stock, price: item.price, customers, sold, wasted: item.stock - sold, revenue, cost, profit: revenue - cost };
  });
  const revenue = lines.reduce((s, l) => s + l.revenue, 0);
  const cost = lines.reduce((s, l) => s + l.cost, 0);
  return { lines, revenue, cost, profit: revenue - cost };
}

// 가장 잘 짠 계획: 상품마다 가격 후보(기준가의 5% 간격)를 훑고, 가격이 정해지면 손님 수만큼 준비하는 게 이득이라(개당 이익 = 가격 − 원가)
// 예산이 모자라면 원가 대비 이익률이 높은 상품부터 채운다. 가격 조합 전체를 훑어서 이익이 가장 큰 계획을 돌려준다.
export function optimalShopPlan(env: ShopEnv): { plan: ShopPlanItem[]; profit: number } {
  const options = SHOP_PRODUCTS.map((product) => {
    const range = shopPriceRange(product);
    const prices = new Set<number>();
    for (let r = SHOP_PRICE_MIN_RATE; r <= SHOP_PRICE_MAX_RATE + 1e-9; r += SHOP_PRICE_GRID_STEP) prices.add(Math.max(range.min, Math.min(range.max, Math.round(product.basePrice * r))));
    return [...prices].map((price) => ({ price, max: shopCustomers(product, price, env) }));
  });
  let best = { profit: -Infinity, plan: [] as ShopPlanItem[] };
  for (const a of options[0]) {
    for (const b of options[1]) {
      for (const c of options[2]) {
        const picks = [a, b, c];
        // 이익률 높은 순으로 예산을 채운다
        const order = [0, 1, 2].sort((i, j) => (picks[j].price - SHOP_PRODUCTS[j].cost) / SHOP_PRODUCTS[j].cost - (picks[i].price - SHOP_PRODUCTS[i].cost) / SHOP_PRODUCTS[i].cost);
        let budget = SHOP_BUDGET;
        const stocks = [0, 0, 0];
        let profit = 0;
        for (const i of order) {
          const unit = picks[i].price - SHOP_PRODUCTS[i].cost;
          if (unit <= 0) continue;
          const n = Math.min(picks[i].max, Math.floor(budget / SHOP_PRODUCTS[i].cost));
          stocks[i] = n;
          budget -= n * SHOP_PRODUCTS[i].cost;
          profit += n * unit;
        }
        if (profit > best.profit) best = { profit, plan: SHOP_PRODUCTS.map((p, i) => ({ productId: p.id, stock: stocks[i], price: picks[i].price })) };
      }
    }
  }
  return { plan: best.plan, profit: best.profit };
}

// 효율(%, 소수 첫째 자리): 이익 ÷ 최적 이익. 손해이거나 최적 이익이 없으면 0.
export function shopEfficiency(profit: number, optimum: number): number {
  if (!(optimum > 0) || !(profit > 0)) return 0;
  return Math.min(100, Math.round((profit / optimum) * 1000) / 10);
}

export interface ShopRewardTier {
  efficiency: number;
  gold: number;
  explorationTickets: number;
  diamonds: number;
}
// 효율이 닿은 단계의 보상을 모두 합쳐 받는다(오늘의 정식 영업 한 번만). 최대 110,000 G · 🎟️1 · 💎3.
export const SHOP_REWARD_TIERS: readonly ShopRewardTier[] = [
  { efficiency: 50, gold: 10_000, explorationTickets: 0, diamonds: 0 },
  { efficiency: 70, gold: 20_000, explorationTickets: 1, diamonds: 0 },
  { efficiency: 85, gold: 30_000, explorationTickets: 0, diamonds: 1 },
  { efficiency: 95, gold: 50_000, explorationTickets: 0, diamonds: 2 },
];
export function shopReward(efficiency: number) {
  return SHOP_REWARD_TIERS.filter((t) => efficiency >= t.efficiency).reduce(
    (sum, t) => ({ gold: sum.gold + t.gold, explorationTickets: sum.explorationTickets + t.explorationTickets, diamonds: sum.diamonds + t.diamonds }),
    { gold: 0, explorationTickets: 0, diamonds: 0 },
  );
}

// 순위: 효율 높은 순 → 이익 높은 순. 같은 효율·이익이면 같은 순위(1, 1, 3). 입력은 이미 그 순서로 정렬돼 있어야 한다.
export function rankShopRows(rows: readonly { efficiency: number; profit: number }[]): number[] {
  const ranks: number[] = [];
  rows.forEach((r, i) => ranks.push(i > 0 && rows[i - 1].efficiency === r.efficiency && rows[i - 1].profit === r.profit ? ranks[i - 1] : i + 1));
  return ranks;
}
