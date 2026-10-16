import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameState, GameStateSchema } from '../game-state/schemas/game-state.schema';
import { SpeciesModule } from '../species/species.module';
import { UsersModule } from '../users/users.module';
import { TerrariumLike, TerrariumLikeSchema } from './schemas/terrarium-like.schema';
import { VisitController } from './visit.controller';
import { VisitService } from './visit.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameState.name, schema: GameStateSchema },
      { name: TerrariumLike.name, schema: TerrariumLikeSchema },
    ]),
    UsersModule,
    SpeciesModule,
  ],
  providers: [VisitService],
  controllers: [VisitController],
})
export class VisitModule {}
