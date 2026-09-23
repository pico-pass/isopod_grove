import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Upgrade, UpgradeSchema } from './schemas/upgrade.schema';
import { UpgradesService } from './upgrades.service';
import { UpgradesController } from './upgrades.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Upgrade.name, schema: UpgradeSchema }]),
  ],
  providers: [UpgradesService],
  controllers: [UpgradesController],
  exports: [UpgradesService],
})
export class UpgradesModule {}
