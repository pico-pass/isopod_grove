import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { StackService } from './stack.service';
import { StackFinishDto, StackStartDto } from './dto/stack.dto';

// 콩 쌓기
@Controller('game-state/stack')
@UseGuards(JwtAuthGuard)
export class StackController {
  constructor(private readonly stackService: StackService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.stackService.get(user.userId);
  }

  @Post('start')
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StackStartDto) {
    return this.stackService.start(user.userId, dto.speciesId);
  }

  @Post('finish')
  finish(@CurrentUser() user: AuthenticatedUser, @Body() dto: StackFinishDto) {
    return this.stackService.finish(user.userId, dto.delays);
  }
}
