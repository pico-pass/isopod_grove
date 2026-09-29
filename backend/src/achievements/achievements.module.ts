import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Achievement, AchievementSchema } from './schemas/achievement.schema';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Achievement.name, schema: AchievementSchema },
    ]),
  ],
  providers: [AchievementsService],
  controllers: [AchievementsController],
  exports: [AchievementsService],
})
export class AchievementsModule {}
