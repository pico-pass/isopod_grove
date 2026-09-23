import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Upgrade, UpgradeDocument } from './schemas/upgrade.schema';
import { UPGRADES_SEED } from './upgrades.seed-data';

@Injectable()
export class UpgradesService implements OnModuleInit {
  private readonly logger = new Logger(UpgradesService.name);

  constructor(
    @InjectModel(Upgrade.name) private upgradeModel: Model<UpgradeDocument>,
  ) {}

  async onModuleInit() {
    for (const seed of UPGRADES_SEED) {
      await this.upgradeModel.updateOne(
        { upgradeId: seed.upgradeId },
        { $setOnInsert: seed },
        { upsert: true },
      );
    }
    this.logger.log(
      `업그레이드 마스터 데이터 시딩 완료 (${UPGRADES_SEED.length}종)`,
    );
  }

  findAll(): Promise<Upgrade[]> {
    return this.upgradeModel.find().exec();
  }

  findOne(upgradeId: string): Promise<Upgrade | null> {
    return this.upgradeModel.findOne({ upgradeId }).exec();
  }

  costFor(upgrade: Upgrade, currentLevel: number): number {
    return Math.round(upgrade.cost * Math.pow(upgrade.factor, currentLevel));
  }
}
