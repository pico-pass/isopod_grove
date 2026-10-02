import { Module } from '@nestjs/common';
import { SpeciesModule } from '../species/species.module';
import { BossController } from './boss.controller';

@Module({
  imports: [SpeciesModule],
  controllers: [BossController],
})
export class BossModule {}
