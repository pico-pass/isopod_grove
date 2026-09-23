import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameState, GameStateSchema } from './schemas/game-state.schema';
import { GameStateService } from './game-state.service';
import { GameStateController } from './game-state.controller';
import { SpeciesModule } from '../species/species.module';
import { UpgradesModule } from '../upgrades/upgrades.module';
import { QuestsModule } from '../quests/quests.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameState.name, schema: GameStateSchema },
    ]),
    SpeciesModule,
    UpgradesModule,
    QuestsModule,
  ],
  providers: [GameStateService],
  controllers: [GameStateController],
  exports: [GameStateService],
})
export class GameStateModule {}
