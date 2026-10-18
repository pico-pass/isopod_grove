import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameState, GameStateSchema } from './schemas/game-state.schema';
import { GameStateService } from './game-state.service';
import { GameStateController } from './game-state.controller';
import { SpeciesModule } from '../species/species.module';
import { UpgradesModule } from '../upgrades/upgrades.module';
import { QuestsModule } from '../quests/quests.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { UsersModule } from '../users/users.module';
import { Friendship, FriendshipSchema } from '../friends/schemas/friendship.schema';
import { PuzzleRecord, PuzzleRecordSchema } from './schemas/puzzle-record.schema';
import { RunnerRecord, RunnerRecordSchema } from './schemas/runner-record.schema';
import { TerrariumLike, TerrariumLikeSchema } from '../visit/schemas/terrarium-like.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameState.name, schema: GameStateSchema },
      // 친구 수 업적 조건을 조회하려고 Friendship 모델만 직접 가져온다(FriendsModule은
      // import하지 않는다 — FriendsModule이 이미 GameStateModule을 쓰고 있어 순환 참조가 된다).
      { name: Friendship.name, schema: FriendshipSchema },
      { name: PuzzleRecord.name, schema: PuzzleRecordSchema },
      { name: RunnerRecord.name, schema: RunnerRecordSchema },
      { name: TerrariumLike.name, schema: TerrariumLikeSchema },
    ]),
    SpeciesModule,
    UpgradesModule,
    QuestsModule,
    AchievementsModule,
    UsersModule,
  ],
  providers: [GameStateService],
  controllers: [GameStateController],
  exports: [GameStateService],
})
export class GameStateModule {}
