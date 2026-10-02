import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Species, SpeciesDocument } from './schemas/species.schema';
import { RARITIES, SPECIES_SEED, rateOfRarity } from './species.seed-data';

// 분양 시세 변동 설정. 기준가(basePrice) 대비 ±25% 범위 안에서, 5분마다 한 번씩
// 평균으로 되돌아가려는 힘(감쇠 0.7)과 임의의 흔들림을 더해 자연스럽게 오르내리게 한다.
const MARKET_TICK_MS = 5 * 60 * 1000; // 5분
const MARKET_INITIAL_DELAY_MS = 10 * 1000; // 서버가 막 켜졌을 때도 곧바로 한 번 움직이게
const MARKET_MAX_OSCILLATION = 0.25;
const MARKET_OSCILLATION_DECAY = 0.7;
const MARKET_OSCILLATION_STEP = 0.25;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

@Injectable()
export class SpeciesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SpeciesService.name);
  // 희귀도(0~4)별 현재 시세 흔들림 정도. -0.25~0.25 사이를 오간다.
  private oscillation: number[] = RARITIES.map(() => 0);
  private tickTimer?: NodeJS.Timeout;
  private startTimer?: NodeJS.Timeout;

  constructor(
    @InjectModel(Species.name) private speciesModel: Model<SpeciesDocument>,
  ) {}

  async onModuleInit() {
    // 시드가 기준(source of truth)이다. 서버가 시작될 때마다 모든 필드를 시드 값으로 덮어쓴다.
    for (const seed of SPECIES_SEED) {
      await this.speciesModel.updateOne(
        { speciesId: seed.speciesId },
        {
          $set: {
            ...seed,
            price: RARITIES[seed.rarity]?.price ?? seed.price,
            rate: rateOfRarity(seed.rarity) ?? seed.rate,
          },
        },
        { upsert: true },
      );
    }
    // 분양 가격은 희귀도가 기준이다. 시드에 없는 종(DB에서 직접 추가한 종)도 함께 맞춘다.
    // 기준가(basePrice)는 항상 이 값으로 다시 맞추고, 지금 가격(price)은 시세 변동으로
    // 흔들려 있을 수 있으니 기준가와 다를 때만 되돌린다(재시작 시 시세도 기준가로 리셋된다).
    // 분당 수익(rate)도 희귀도가 기준이라 같은 방식으로 모든 종에 맞춘다.
    for (const [rarity, { price }] of RARITIES.entries()) {
      await this.speciesModel.updateMany(
        { rarity },
        { $set: { basePrice: price, rate: rateOfRarity(rarity) } },
      );
      await this.speciesModel.updateMany(
        { rarity, price: { $ne: price } },
        { $set: { price } },
      );
    }
    this.logger.log(`종 마스터 데이터 시딩 완료 (${SPECIES_SEED.length}종)`);

    this.oscillation = RARITIES.map(() => 0);
    this.startTimer = setTimeout(() => {
      void this.tickMarket();
      this.tickTimer = setInterval(() => void this.tickMarket(), MARKET_TICK_MS);
    }, MARKET_INITIAL_DELAY_MS);
  }

  onModuleDestroy() {
    if (this.startTimer) clearTimeout(this.startTimer);
    if (this.tickTimer) clearInterval(this.tickTimer);
  }

  findAll(): Promise<Species[]> {
    return this.speciesModel.find().sort({ rarity: 1, price: 1 }).exec();
  }

  findOne(speciesId: string): Promise<Species | null> {
    return this.speciesModel.findOne({ speciesId }).exec();
  }

  // 희귀도별 시세를 한 단계 흔들고 DB에 반영한다. 평균(기준가)으로 되돌아가려는 힘이 있어서
  // 계속 한쪽으로 쏠리지 않고 오르내림을 반복한다.
  private async tickMarket() {
    const summary: string[] = [];
    for (const [rarity, { name, price: basePrice }] of RARITIES.entries()) {
      const prev = this.oscillation[rarity];
      const next = clamp(
        prev * MARKET_OSCILLATION_DECAY + (Math.random() - 0.5) * MARKET_OSCILLATION_STEP,
        -MARKET_MAX_OSCILLATION,
        MARKET_MAX_OSCILLATION,
      );
      this.oscillation[rarity] = next;
      const newPrice = Math.max(1, Math.round(basePrice * (1 + next)));
      await this.speciesModel.updateMany({ rarity }, { $set: { price: newPrice } });
      const pct = Math.round(next * 100);
      summary.push(`${name} ${newPrice}G(${pct >= 0 ? '+' : ''}${pct}%)`);
    }
    this.logger.log(`분양 시세 변동: ${summary.join(', ')}`);
  }
}
