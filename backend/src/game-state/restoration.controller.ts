import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { RestorationService } from './restoration.service';
import { RestorationClaimDto } from './dto/restoration.dto';

// 숲 복원 프로젝트
@Controller('game-state/restoration')
@UseGuards(JwtAuthGuard)
export class RestorationController {
  constructor(private readonly restorationService: RestorationService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.restorationService.get(user.userId);
  }

  @Post('claim')
  claim(@CurrentUser() user: AuthenticatedUser, @Body() dto: RestorationClaimDto) {
    return this.restorationService.claim(user.userId, dto.id, dto.last === true);
  }
}
