import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  GameState,
  GameStateSchema,
} from '../game-state/schemas/game-state.schema';
import { UsersModule } from '../users/users.module';
import { SpeciesModule } from '../species/species.module';
import { UpgradesModule } from '../upgrades/upgrades.module';
import { QuestsModule } from '../quests/quests.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameState.name, schema: GameStateSchema },
    ]),
    UsersModule,
    SpeciesModule,
    UpgradesModule,
    QuestsModule,
    AchievementsModule,
  ],
  providers: [AdminService, AdminGuard],
  controllers: [AdminController],
})
export class AdminModule {}
