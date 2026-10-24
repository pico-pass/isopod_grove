import { EQUIPMENT_CATALOG } from '../equipment/equipment.data';
import { DECOR_CATALOG } from '../decor/decor.data';
import { isSeasonalEventActive } from './event-engine';
import { getPuzzleResetAt } from './puzzle-engine';
import { seededRandom } from './dungeon-engine';
import { hashDay } from './wanted-engine';
import type { BoostKind } from './game-engine';

// ---- 매일 경매 ----
// 매일 서버가 희귀한 물건 3개(장비·지나간 한정 장식·부스트)를 경매에 올리고, 유저가 골드로 입찰한다.
// 입찰한 골드는 그 자리에서 빠져나가(보관) 밀리면 돌아오고, 한국 시간 자정에 마감해 최고가 입찰자가 낙찰받는다.
// 낙찰금은 사라지는 골드이고(소비처), 유저끼리 물건·골드를 주고받지 않아서 거래 부정이 없다. 입찰가는 모두에게 공개된다.

export const AUCTION_LOT_COUNT = 3;
export const AUCTION_MIN_INCREMENT = 1_000;
export const AUCTION_INCREMENT_RATE = 0.05;
export const AUCTION_MAX_BID = 2_000_000_000;
export const AUCTION_KEEP_DAYS = 60; // 마감한 경매 기록을 보관하는 기간(낙찰품은 그 안에 받아야 한다)
export const AUCTION_BOOST_HOURS = 12;

export type AuctionKind = 'equipment' | 'decor' | 'boost';

export interface AuctionLotDef {
  lot: number;
  kind: AuctionKind;
  itemId: string; // 장비 id · 장식 id · 부스트 종류(BoostKind)
  boostHours?: number;
  minBid: number; // 시작가
}

// 장비는 전설(희귀도 3)·신화(4) 중에서, 시작가는 희귀도별
const EQUIPMENT_MIN_BID: Record<number, number> = { 3: 600_000, 4: 2_400_000 };
export const AUCTION_BOOST_MIN_BID = 300_000;
export const AUCTION_DECOR_PRICE_RATE = 2; // 한정 장식 시작가 = 상점 가격 × 이 배수

const BOOST_KINDS: readonly BoostKind[] = ['income', 'breed', 'battleXp'];

// 그날 정오(한국 시간)의 시각. 이벤트가 열려 있는지 따질 때 쓴다.
const noonOf = (day: string) => Date.parse(`${day}T12:00:00+09:00`);

// 그 날짜의 경매 물건 3개. 같은 날짜는 항상 같다.
export function auctionLotsFor(day: string): AuctionLotDef[] {
  const rng = seededRandom(hashDay(`auction:${day}`), 83);
  // 1) 전설·신화 장비(신화 40%)
  const rarity = rng() < 0.4 ? 4 : 3;
  const equipments = EQUIPMENT_CATALOG.filter((e) => e.rarity === rarity).sort((a, b) => a.equipmentId.localeCompare(b.equipmentId));
  const equipment = equipments[Math.min(equipments.length - 1, Math.floor(rng() * equipments.length))];
  // 2) 지금 이벤트 기간이 아닌 한정 장식(상점에서는 못 사는 것을 경매로 구할 수 있다). 전부 기간 중이면 아무 한정 장식.
  const limited = DECOR_CATALOG.filter((d) => d.eventId).sort((a, b) => a.decorId.localeCompare(b.decorId));
  const closed = limited.filter((d) => !isSeasonalEventActive(d.eventId as string, noonOf(day)));
  const decorPool = closed.length > 0 ? closed : limited;
  const decor = decorPool[Math.min(decorPool.length - 1, Math.floor(rng() * decorPool.length))];
  // 3) 12시간 부스트
  const boost = BOOST_KINDS[Math.min(BOOST_KINDS.length - 1, Math.floor(rng() * BOOST_KINDS.length))];
  return [
    { lot: 0, kind: 'equipment', itemId: equipment.equipmentId, minBid: EQUIPMENT_MIN_BID[rarity] },
    { lot: 1, kind: 'decor', itemId: decor.decorId, minBid: decor.price * AUCTION_DECOR_PRICE_RATE },
    { lot: 2, kind: 'boost', itemId: boost, boostHours: AUCTION_BOOST_HOURS, minBid: AUCTION_BOOST_MIN_BID },
  ];
}

// 다음 입찰의 최소 금액: 아직 입찰이 없으면 시작가, 있으면 현재가 + 인상폭(현재가의 5%를 천 단위로 올림, 최소 1,000)
export function auctionIncrement(top: number): number {
  return Math.max(AUCTION_MIN_INCREMENT, Math.ceil((top * AUCTION_INCREMENT_RATE) / 1000) * 1000);
}
export function auctionMinNextBid(top: number | null | undefined, minBid: number): number {
  return top && top > 0 ? top + auctionIncrement(top) : minBid;
}

// 마감 시각: 그 날짜가 끝나는 한국 시간 자정
export function auctionClosesAt(day: string): number {
  return getPuzzleResetAt(day);
}
