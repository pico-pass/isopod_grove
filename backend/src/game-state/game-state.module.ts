import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameState, GameStateSchema } from './schemas/game-state.schema';
import { GameStateService } from './game-state.service';
import { GameStateController } from './game-state.controller';
import { WantedService } from './wanted.service';
import { WantedController } from './wanted.controller';
import { UnderdogService } from './underdog.service';
import { UnderdogController } from './underdog.controller';
import { StackService } from './stack.service';
import { StackController } from './stack.controller';
import { ShopSimService } from './shop-sim.service';
import { ShopSimController } from './shop-sim.controller';
import { QuizService } from './quiz.service';
import { QuizController, QuizImageController } from './quiz.controller';
import { AwakenService } from './awaken.service';
import { AwakenController } from './awaken.controller';
import { MerchantService } from './merchant.service';
import { MerchantController } from './merchant.controller';
import { MerchantDay, MerchantDaySchema } from './schemas/merchant.schema';
import { ExhibitService } from './exhibit.service';
import { ExhibitController } from './exhibit.controller';
import { ManagerService } from './manager.service';
import { ManagerController } from './manager.controller';
import { EngraveService } from './engrave.service';
import { EngraveController } from './engrave.controller';
import { SkillLabService } from './skill-lab.service';
import { SkillLabController } from './skill-lab.controller';
import { AuctionService } from './auction.service';
import { AuctionController } from './auction.controller';
import { AuctionLot, AuctionLotSchema } from './schemas/auction.schema';
import { FortuneService } from './fortune.service';
import { FortuneController } from './fortune.controller';
import { SeasonalService } from './seasonal.service';
import { SeasonalController } from './seasonal.controller';
import { RestorationService } from './restoration.service';
import { RestorationController } from './restoration.controller';
import { RestorationLedger } from './restoration-ledger.service';
import { RestorationEntry, RestorationEntrySchema, RestorationWeek, RestorationWeekSchema } from './schemas/restoration.schema';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { ForestEvent, ForestEventSchema, NewsEdition, NewsEditionSchema } from './schemas/forest-event.schema';
import { WeatherLog, WeatherLogSchema } from '../weather/schemas/weather-log.schema';
import { QuizRecord, QuizRecordSchema } from './schemas/quiz-record.schema';
import { ShopSimDay, ShopSimDaySchema, ShopSimRecord, ShopSimRecordSchema } from './schemas/shop-sim.schema';
import { StackRecord, StackRecordSchema } from './schemas/stack-record.schema';
import { UnderdogEntry, UnderdogEntrySchema } from './schemas/underdog-entry.schema';
import { SpeciesModule } from '../species/species.module';
import { UpgradesModule } from '../upgrades/upgrades.module';
import { QuestsModule } from '../quests/quests.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { UsersModule } from '../users/users.module';
import { WeatherModule } from '../weather/weather.module';
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
      { name: UnderdogEntry.name, schema: UnderdogEntrySchema },
      { name: StackRecord.name, schema: StackRecordSchema },
      { name: ShopSimRecord.name, schema: ShopSimRecordSchema },
      { name: QuizRecord.name, schema: QuizRecordSchema },
      { name: ForestEvent.name, schema: ForestEventSchema },
      { name: NewsEdition.name, schema: NewsEditionSchema },
      { name: RestorationWeek.name, schema: RestorationWeekSchema },
      { name: AuctionLot.name, schema: AuctionLotSchema },
      { name: MerchantDay.name, schema: MerchantDaySchema },
      { name: RestorationEntry.name, schema: RestorationEntrySchema },
      { name: WeatherLog.name, schema: WeatherLogSchema },
      { name: ShopSimDay.name, schema: ShopSimDaySchema },
    ]),
    SpeciesModule,
    UpgradesModule,
    QuestsModule,
    AchievementsModule,
    UsersModule,
    WeatherModule,
  ],
  providers: [GameStateService, WantedService, UnderdogService, StackService, ShopSimService, QuizService, NewsService, RestorationLedger, RestorationService, SeasonalService, FortuneService, AuctionService, SkillLabService, EngraveService, ManagerService, ExhibitService, MerchantService, AwakenService],
  controllers: [GameStateController, WantedController, UnderdogController, StackController, ShopSimController, QuizController, QuizImageController, NewsController, RestorationController, SeasonalController, FortuneController, AuctionController, SkillLabController, EngraveController, ManagerController, ExhibitController, MerchantController, AwakenController],
  exports: [GameStateService],
})
export class GameStateModule {}
