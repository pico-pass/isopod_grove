import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { UpgradesService } from './upgrades.service';

@Controller('upgrades')
export class UpgradesController {
  constructor(private readonly upgradesService: UpgradesService) {}

  @Get()
  findAll() {
    return this.upgradesService.findAll();
  }

  @Get(':upgradeId')
  async findOne(@Param('upgradeId') upgradeId: string) {
    const upgrade = await this.upgradesService.findOne(upgradeId);
    if (!upgrade) throw new NotFoundException('존재하지 않는 업그레이드예요.');
    return upgrade;
  }
}
