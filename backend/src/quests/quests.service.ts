import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Quest, QuestDocument } from './schemas/quest.schema';
import { QUESTS_SEED } from './quests.seed-data';

@Injectable()
export class QuestsService implements OnModuleInit {
  private readonly logger = new Logger(QuestsService.name);

  constructor(
    @InjectModel(Quest.name) private questModel: Model<QuestDocument>,
  ) {}

  async onModuleInit() {
    for (const seed of QUESTS_SEED) {
      await this.questModel.updateOne(
        { questId: seed.questId },
        { $setOnInsert: seed },
        { upsert: true },
      );
    }
    this.logger.log(
      `일일 퀘스트 마스터 데이터 시딩 완료 (${QUESTS_SEED.length}종)`,
    );
  }

  findAll(): Promise<Quest[]> {
    return this.questModel.find().exec();
  }

  findOne(questId: string): Promise<Quest | null> {
    return this.questModel.findOne({ questId }).exec();
  }
}
