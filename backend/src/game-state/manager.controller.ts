import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ManagerService } from './manager.service';
import { ManagerHireDto } from './dto/manager.dto';

// 사육장 관리인 고용
@Controller('game-state/manager')
@UseGuards(JwtAuthGuard)
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.managerService.get(user.userId);
  }

  @Post('hire')
  hire(@CurrentUser() user: AuthenticatedUser, @Body() dto: ManagerHireDto) {
    return this.managerService.hire(user.userId, dto.grade);
  }

  @Post('dismiss')
  dismiss(@CurrentUser() user: AuthenticatedUser) {
    return this.managerService.dismiss(user.userId);
  }
}
