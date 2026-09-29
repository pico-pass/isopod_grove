import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Achievement, AchievementDocument } from './schemas/achievement.schema';
import { ACHIEVEMENTS_SEED } from './achievements.seed-data';

@Injectable()
export class AchievementsService implements OnModuleInit {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    @InjectModel(Achievement.name)
    private achievementModel: Model<AchievementDocument>,
  ) {}

  async onModuleInit() {
    // 업적은 시드가 기준이다. 조건이나 보상을 바꾸면 재시작만으로 반영된다.
    for (const seed of ACHIEVEMENTS_SEED) {
      await this.achievementModel.updateOne(
        { achievementId: seed.achievementId },
        { $set: seed },
        { upsert: true },
      );
    }
    this.logger.log(`업적 마스터 데이터 시딩 완료 (${ACHIEVEMENTS_SEED.length}종)`);
  }

  findAll(): Promise<Achievement[]> {
    return this.achievementModel.find().exec();
  }

  findOne(achievementId: string): Promise<Achievement | null> {
    return this.achievementModel.findOne({ achievementId }).exec();
  }
}
