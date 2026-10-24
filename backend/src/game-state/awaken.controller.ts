import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AwakenService } from './awaken.service';
import { AwakenDto } from './dto/awaken.dto';

// 전투 레벨 각성 ★
@Controller('game-state/awaken')
@UseGuards(JwtAuthGuard)
export class AwakenController {
  constructor(private readonly awakenService: AwakenService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.awakenService.get(user.userId);
  }

  @Post()
  awaken(@CurrentUser() user: AuthenticatedUser, @Body() dto: AwakenDto) {
    return this.awakenService.awaken(user.userId, dto.speciesId);
  }
}
