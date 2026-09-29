import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameState, GameStateSchema } from '../game-state/schemas/game-state.schema';
import { UsersModule } from '../users/users.module';
import { SpeciesModule } from '../species/species.module';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameState.name, schema: GameStateSchema },
    ]),
    UsersModule,
    SpeciesModule,
  ],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
