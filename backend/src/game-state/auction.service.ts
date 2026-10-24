import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EQUIPMENT_BY_ID } from '../equipment/equipment.data';
import { findDecor } from '../decor/decor.data';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { GameStateService } from './game-state.service';
import { GameStateDocument } from './schemas/game-state.schema';
import { AuctionLot, AuctionLotDocument } from './schemas/auction.schema';
import { BOOST_INFO, type BoostKind } from './game-engine';
import { RARITIES } from '../species/species.seed-data';
import { findSeasonalEvent } from './event-engine';
import { getPuzzleDayKey } from './puzzle-engine';
import {
  AUCTION_INCREMENT_RATE,
  AUCTION_KEEP_DAYS,
  AUCTION_LOT_COUNT,
  AUCTION_MIN_INCREMENT,
  auctionClosesAt,
  auctionLotsFor,
  auctionMinNextBid,
} from './auction-engine';

type LeanLot = {
  _id: Types.ObjectId;
  day: string;
  lot: number;
  kind: 'equipment' | 'decor' | 'boost';
  itemId: string;
  boostHours: number;
  minBid: number;
  closesAt: number;
  top: { userId: Types.ObjectId; amount: number; at: number } | null;
  bids: number;
  history: { userId: Types.ObjectId; amount: number; at: number }[];
  refunds: { userId: Types.ObjectId; amount: number; claimed: boolean }[];
  delivered: boolean;
};

const BOOST_ICON: Record<string, string> = { income: '💰', breed: '🥚', battleXp: '⚔️' };
const CATEGORY_LABEL: Record<string, string> = { weapon: '무기', armor: '방어구', charm: '장신구' };
const DAY_MS = 24 * 3_600_000;
const fmt = (n: number) => n.toLocaleString('ko-KR');

// 물건 하나의 화면용 정보(이름·아이콘·설명)
export function auctionItemInfo(kind: string, itemId: string, boostHours: number) {
  if (kind === 'equipment') {
    const e = EQUIPMENT_BY_ID.get(itemId);
    return { name: e?.name ?? itemId, icon: e?.icon ?? '🎒', description: e ? `${RARITIES[e.rarity]?.name ?? ''} ${CATEGORY_LABEL[e.category] ?? ''} · ${e.description}` : '', tag: '장비' };
  }
  if (kind === 'decor') {
    const d = findDecor(itemId);
    const event = d?.eventId ? findSeasonalEvent(d.eventId) : undefined;
    return { name: d?.name ?? itemId, icon: d?.icon ?? '🎨', description: d ? `${d.kind === 'backdrop' ? '배경' : '소품'} · ${d.description}` : '', tag: event ? `${event.name} 한정 장식` : '장식' };
  }
  const info = BOOST_INFO.find((b) => b.kind === (itemId as BoostKind));
  return { name: `${info?.name ?? itemId} ${boostHours}시간`, icon: BOOST_ICON[itemId] ?? '⚡', description: info?.description ?? '', tag: '부스트' };
}

// 매일 경매: 규칙과 물건 뽑기는 auction-engine.ts. 여기서는 오늘의 물건을 만들고, 입찰·환불·낙찰품 지급을 서버가 처리한다.
@Injectable()
export class AuctionService {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly gameState: GameStateService,
    private readonly usersService: UsersService,
    @InjectModel(AuctionLot.name) private readonly lots: Model<AuctionLotDocument>,
  ) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('경매를 처리하는 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  // 그날의 물건 3개를 돌려준다. 아직 없으면 만든다(동시에 만들어도 한 번만 들어간다).
  async ensureDay(day: string, now = Date.now()): Promise<LeanLot[]> {
    let found = await this.lots.find({ day }).sort({ lot: 1 }).lean<LeanLot[]>();
    if (found.length >= AUCTION_LOT_COUNT) return found;
    const closesAt = auctionClosesAt(day);
    for (const def of auctionLotsFor(day)) {
      if (found.some((l) => l.lot === def.lot)) continue;
      try {
        await this.lots.updateOne(
          { day, lot: def.lot },
          { $setOnInsert: { kind: def.kind, itemId: def.itemId, boostHours: def.boostHours ?? 0, minBid: def.minBid, closesAt, top: null, bids: 0, history: [], refunds: [], delivered: false, expireAt: new Date(closesAt + AUCTION_KEEP_DAYS * DAY_MS) } },
          { upsert: true },
        );
      } catch {
        // 동시에 만든 쪽이 있으면 아래에서 다시 읽는다
      }
    }
    found = await this.lots.find({ day }).sort({ lot: 1 }).lean<LeanLot[]>();
    return found;
  }

  private async names(ids: (Types.ObjectId | string)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.map((i) => i.toString()))];
    if (unique.length === 0) return new Map();
    const users = await this.usersService.findByIds(unique);
    return new Map(users.map((u) => [u._id.toString(), effectiveDisplayName(u)]));
  }

  // 밀려서 돌아온 입찰금(아직 안 받은 것)을 모두 "받음"으로 바꾸고 합계를 돌려준다. 읽으면서 바꿔서 두 번 받을 수 없다.
  private async takeRefunds(userId: string): Promise<number> {
    const uid = new Types.ObjectId(userId);
    let total = 0;
    for (let i = 0; i < 200; i++) {
      const doc = await this.lots
        .findOneAndUpdate({ refunds: { $elemMatch: { userId: uid, claimed: false } } }, { $set: { 'refunds.$.claimed': true } }, { returnDocument: 'before' })
        .lean<LeanLot>();
      if (!doc) break;
      const el = doc.refunds.find((r) => r.userId.toString() === userId && !r.claimed);
      total += el?.amount ?? 0;
    }
    return total;
  }

  async get(userId: string) {
    const now = Date.now();
    const day = getPuzzleDayKey(now);
    const uid = new Types.ObjectId(userId);
    const [lots, gameState, yesterdayLots, refundDocs, wonDocs] = await Promise.all([
      this.ensureDay(day, now),
      this.gameState.getOrThrow(userId),
      this.lots.find({ day: getPuzzleDayKey(now - DAY_MS) }).sort({ lot: 1 }).lean<LeanLot[]>(),
      this.lots.find({ refunds: { $elemMatch: { userId: uid, claimed: false } } }).lean<LeanLot[]>(),
      this.lots.find({ 'top.userId': uid, closesAt: { $lte: now }, delivered: false }).sort({ day: 1, lot: 1 }).lean<LeanLot[]>(),
    ]);
    const names = await this.names([...lots.flatMap((l) => [...(l.top ? [l.top.userId] : []), ...l.history.map((h) => h.userId)]), ...yesterdayLots.flatMap((l) => (l.top ? [l.top.userId] : []))]);
    const nameOf = (id: Types.ObjectId) => names.get(id.toString()) ?? '숲지기';
    const owned = new Set(gameState.decorOwned ?? []);

    const lotViews = lots.map((l) => {
      const info = auctionItemInfo(l.kind, l.itemId, l.boostHours);
      const iAmTop = !!l.top && l.top.userId.toString() === userId;
      const outbid = !iAmTop && l.refunds.some((r) => r.userId.toString() === userId);
      return {
        lot: l.lot,
        kind: l.kind,
        ...info,
        minBid: l.minBid,
        nextMin: auctionMinNextBid(l.top?.amount, l.minBid),
        top: l.top ? { amount: l.top.amount, displayName: nameOf(l.top.userId), isMe: iAmTop } : null,
        bids: l.bids,
        mine: iAmTop ? ('leading' as const) : outbid ? ('outbid' as const) : ('none' as const),
        myBid: iAmTop ? l.top!.amount : 0,
        alreadyOwned: l.kind === 'decor' && owned.has(l.itemId),
        history: l.history.slice(-8).reverse().map((h) => ({ displayName: nameOf(h.userId), amount: h.amount, at: h.at, isMe: h.userId.toString() === userId })),
      };
    });

    const refundTotal = refundDocs.reduce((sum, d) => sum + d.refunds.filter((r) => r.userId.toString() === userId && !r.claimed).reduce((a, r) => a + r.amount, 0), 0);
    return {
      day,
      closesAt: lots[0]?.closesAt ?? auctionClosesAt(day),
      endsInMs: (lots[0]?.closesAt ?? auctionClosesAt(day)) - now,
      coins: gameState.coins,
      lots: lotViews,
      yesterday: yesterdayLots.length === 0 ? null : {
        day: yesterdayLots[0].day,
        lots: yesterdayLots.map((l) => ({ lot: l.lot, ...auctionItemInfo(l.kind, l.itemId, l.boostHours), winner: l.top ? { displayName: nameOf(l.top.userId), amount: l.top.amount, isMe: l.top.userId.toString() === userId } : null })),
      },
      pending: {
        refund: refundTotal,
        won: wonDocs.map((l) => ({ day: l.day, lot: l.lot, amount: l.top!.amount, ...auctionItemInfo(l.kind, l.itemId, l.boostHours) })),
      },
      rules: { minIncrement: AUCTION_MIN_INCREMENT, incrementRate: AUCTION_INCREMENT_RATE },
    };
  }

  async bid(userId: string, lotNo: number, amount: number) {
    return this.withLock(userId, async () => {
      const now = Date.now();
      const day = getPuzzleDayKey(now);
      const cur = (await this.ensureDay(day, now)).find((l) => l.lot === lotNo);
      if (!cur) throw new BadRequestException('존재하지 않는 경매 물건이에요.');
      if (cur.closesAt <= now) throw new BadRequestException('이미 마감된 경매예요.');
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      if (cur.kind === 'decor' && (gameState.decorOwned ?? []).includes(cur.itemId)) throw new BadRequestException('이미 가지고 있는 장식은 입찰할 수 없어요.');
      const iAmTop = !!cur.top && cur.top.userId.toString() === userId;
      const minNext = auctionMinNextBid(cur.top?.amount, cur.minBid);
      if (!Number.isInteger(amount) || amount < minNext) throw new BadRequestException(`${fmt(minNext)} G 이상으로 입찰해 주세요.`);

      // 밀려서 돌아온 입찰금을 먼저 받아서 쓸 수 있게 한다
      const refunded = await this.takeRefunds(userId);
      if (refunded > 0) {
        gameState.coins += refunded;
        this.gameState.pushLog(gameState, 'coins', `경매에서 밀린 입찰금 ${fmt(refunded)} G가 돌아왔어요.`);
      }
      const need = amount - (iAmTop ? cur.top!.amount : 0);
      if (gameState.coins < need) {
        if (refunded > 0) await gameState.save();
        throw new BadRequestException(`골드가 부족해요. ${fmt(need)} G가 필요해요.`);
      }
      // 입찰금을 먼저 보관(차감)하고, 최고가를 바꾸는 데 실패하면 되돌린다
      gameState.coins -= need;
      await gameState.save();

      const uid = new Types.ObjectId(userId);
      const filter: Record<string, unknown> = { day, lot: lotNo, closesAt: { $gt: now } };
      if (cur.top) {
        filter['top.userId'] = cur.top.userId;
        filter['top.amount'] = cur.top.amount;
      } else {
        filter.top = null;
      }
      const entry = { userId: uid, amount, at: now };
      const swapped = await this.lots.findOneAndUpdate(
        filter,
        {
          $set: { top: entry },
          $inc: { bids: 1 },
          $push: { history: { $each: [entry], $slice: -20 }, ...(cur.top && !iAmTop ? { refunds: { userId: cur.top.userId, amount: cur.top.amount, claimed: false } } : {}) },
        },
        { returnDocument: 'after' },
      );
      if (!swapped) {
        gameState.coins += need;
        await gameState.save();
        throw new BadRequestException('방금 다른 숲지기가 먼저 입찰했어요. 바뀐 금액을 확인하고 다시 입찰해 주세요.');
      }
      const info = auctionItemInfo(cur.kind, cur.itemId, cur.boostHours);
      this.gameState.pushLog(gameState, 'coins', `경매 입찰: ${info.icon} ${info.name} ${fmt(amount)} G (-${fmt(need)} G 보관)`);
      await gameState.save();
      return { gameState, message: `${info.icon} ${info.name}에 ${fmt(amount)} G로 입찰했어요! 마감(자정)까지 최고가를 지키면 낙찰이에요.`, status: await this.get(userId) };
    });
  }

  // 부스트 시간을 더한다(이미 켜져 있으면 그만큼 늘리고, 없으면 지금부터 시작)
  private grantBoost(gameState: GameStateDocument, kind: string, hours: number, now: number) {
    const current = (gameState.boosts ?? []).find((b) => b.kind === kind && b.until > now);
    const bought = current ? { kind, from: current.from, until: current.until + hours * 3_600_000 } : { kind, from: now, until: now + hours * 3_600_000 };
    const others = (gameState.boosts ?? []).filter((b) => b.kind !== kind && b.until > now).map((b) => ({ kind: b.kind, from: b.from, until: b.until }));
    gameState.boosts = [...others, bought];
  }

  // 돌아온 입찰금과 낙찰품을 받는다
  async claim(userId: string) {
    return this.withLock(userId, async () => {
      const now = Date.now();
      const uid = new Types.ObjectId(userId);
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const refunded = await this.takeRefunds(userId);
      const won = await this.lots.find({ 'top.userId': uid, closesAt: { $lte: now }, delivered: false }).sort({ day: 1, lot: 1 }).lean<LeanLot[]>();
      const parts: string[] = [];
      if (refunded > 0) {
        gameState.coins += refunded;
        parts.push(`돌아온 입찰금 ${fmt(refunded)} G`);
      }
      for (const l of won) {
        // 먼저 "지급함"으로 바꿔서(읽으면서) 두 번 받을 수 없게 한다
        const flipped = await this.lots.findOneAndUpdate({ _id: l._id, delivered: false, 'top.userId': uid }, { $set: { delivered: true } }, { returnDocument: 'before' }).lean<LeanLot>();
        if (!flipped) continue;
        const info = auctionItemInfo(l.kind, l.itemId, l.boostHours);
        const price = l.top!.amount;
        if (l.kind === 'equipment') {
          const { isNew } = this.gameState.grantEquipment(gameState, l.itemId);
          parts.push(`${info.icon} ${info.name}${isNew ? '(새 장비!)' : ' 복사본 +1'}`);
        } else if (l.kind === 'decor') {
          if ((gameState.decorOwned ?? []).includes(l.itemId)) {
            gameState.coins += price;
            parts.push(`${info.icon} ${info.name}은(는) 이미 있어서 낙찰금 ${fmt(price)} G를 돌려받았어요`);
          } else {
            gameState.decorOwned = [...(gameState.decorOwned ?? []), l.itemId];
            parts.push(`${info.icon} ${info.name}`);
          }
        } else {
          this.grantBoost(gameState, l.itemId, l.boostHours, now);
          parts.push(`${info.icon} ${info.name}`);
        }
        this.gameState.pushLog(gameState, 'trophy', `경매 낙찰품 수령: ${info.icon} ${info.name} (${fmt(price)} G)`);
      }
      if (parts.length === 0) throw new BadRequestException('받을 낙찰품이나 돌아온 입찰금이 없어요.');
      await gameState.save();
      return { gameState, message: `받았어요: ${parts.join(' · ')}`, status: await this.get(userId) };
    });
  }
}
