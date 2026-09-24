import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Species, SpeciesDocument } from './schemas/species.schema';
import { RARITIES, SPECIES_SEED } from './species.seed-data';

@Injectable()
export class SpeciesService implements OnModuleInit {
  private readonly logger = new Logger(SpeciesService.name);

  constructor(
    @InjectModel(Species.name) private speciesModel: Model<SpeciesDocument>,
  ) {}

  async onModuleInit() {
    // 시드가 기준(source of truth)이다. 서버가 시작될 때마다 모든 필드를 시드 값으로 덮어쓴다.
    for (const seed of SPECIES_SEED) {
      await this.speciesModel.updateOne(
        { speciesId: seed.speciesId },
        { $set: { ...seed, price: RARITIES[seed.rarity]?.price ?? seed.price } },
        { upsert: true },
      );
    }
    // 분양 가격은 희귀도가 기준이다. 시드에 없는 종(DB에서 직접 추가한 종)도 함께 맞춘다.
    for (const [rarity, { price }] of RARITIES.entries()) {
      await this.speciesModel.updateMany(
        { rarity, price: { $ne: price } },
        { $set: { price } },
      );
    }
    this.logger.log(`종 마스터 데이터 시딩 완료 (${SPECIES_SEED.length}종)`);
  }

  findAll(): Promise<Species[]> {
    return this.speciesModel.find().sort({ rarity: 1, price: 1 }).exec();
  }

  findOne(speciesId: string): Promise<Species | null> {
    return this.speciesModel.findOne({ speciesId }).exec();
  }
}
