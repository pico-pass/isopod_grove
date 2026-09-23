import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Quest, QuestSchema } from './schemas/quest.schema';
import { QuestsService } from './quests.service';
import { QuestsController } from './quests.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quest.name, schema: QuestSchema }]),
  ],
  providers: [QuestsService],
  controllers: [QuestsController],
  exports: [QuestsService],
})
export class QuestsModule {}
