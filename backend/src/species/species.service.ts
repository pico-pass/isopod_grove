import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Species, SpeciesDocument } from './schemas/species.schema';
import { SPECIES_SEED } from './species.seed-data';

@Injectable()
export class SpeciesService implements OnModuleInit {
  private readonly logger = new Logger(SpeciesService.name);

  constructor(
    @InjectModel(Species.name) private speciesModel: Model<SpeciesDocument>,
  ) {}

  async onModuleInit() {
    for (const seed of SPECIES_SEED) {
      await this.speciesModel.updateOne(
        { speciesId: seed.speciesId },
        { $setOnInsert: seed },
        { upsert: true },
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
