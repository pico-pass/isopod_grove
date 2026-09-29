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
    // 시드가 기준이다. 서버가 시작될 때마다 비용/배율/설명을 시드 값으로 덮어써서
    // 밸런스 조정이 재시작만으로 반영되게 한다. 이미 올린 레벨(currentLevel)은
    // GameState 쪽에 저장돼 있어 영향받지 않는다.
    for (const seed of UPGRADES_SEED) {
      await this.upgradeModel.updateOne(
        { upgradeId: seed.upgradeId },
        { $set: seed },
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
