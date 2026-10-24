import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { SkillLabService } from './skill-lab.service';
import { SkillLabUpgradeDto } from './dto/skill-lab.dto';

// 계열 기술 연구소
@Controller('game-state/skill-lab')
@UseGuards(JwtAuthGuard)
export class SkillLabController {
  constructor(private readonly skillLabService: SkillLabService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.skillLabService.get(user.userId);
  }

  @Post('upgrade')
  upgrade(@CurrentUser() user: AuthenticatedUser, @Body() dto: SkillLabUpgradeDto) {
    return this.skillLabService.upgrade(user.userId, dto.id);
  }
}
