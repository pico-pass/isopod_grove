import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameState, GameStateSchema } from '../game-state/schemas/game-state.schema';
import { PuzzleRecord, PuzzleRecordSchema } from '../game-state/schemas/puzzle-record.schema';
import { RunnerRecord, RunnerRecordSchema } from '../game-state/schemas/runner-record.schema';
import { StackRecord, StackRecordSchema } from '../game-state/schemas/stack-record.schema';
import { QuizRecord, QuizRecordSchema } from '../game-state/schemas/quiz-record.schema';
import { TerrariumLike, TerrariumLikeSchema } from '../visit/schemas/terrarium-like.schema';
import { UsersModule } from '../users/users.module';
import { SpeciesModule } from '../species/species.module';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameState.name, schema: GameStateSchema },
      { name: PuzzleRecord.name, schema: PuzzleRecordSchema },
      { name: RunnerRecord.name, schema: RunnerRecordSchema },
      { name: StackRecord.name, schema: StackRecordSchema },
      { name: QuizRecord.name, schema: QuizRecordSchema },
      { name: TerrariumLike.name, schema: TerrariumLikeSchema },
    ]),
    UsersModule,
    SpeciesModule,
  ],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
