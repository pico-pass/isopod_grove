import { Module } from '@nestjs/common';
import { SpeciesModule } from '../species/species.module';
import { BossController } from './boss.controller';
import { SurvivalInfoController } from './survival-info.controller';

@Module({
  imports: [SpeciesModule],
  controllers: [BossController, SurvivalInfoController],
})
export class BossModule {}
