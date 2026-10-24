import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { EngraveService } from './engrave.service';
import { EngraveItemDto } from './dto/engrave.dto';

// 장비 각인 재련소
@Controller('game-state/engrave')
@UseGuards(JwtAuthGuard)
export class EngraveController {
  constructor(private readonly engraveService: EngraveService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.engraveService.get(user.userId);
  }

  @Post('roll')
  roll(@CurrentUser() user: AuthenticatedUser, @Body() dto: EngraveItemDto) {
    return this.engraveService.roll(user.userId, dto.itemId);
  }

  @Post('accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Body() dto: EngraveItemDto) {
    return this.engraveService.accept(user.userId, dto.itemId);
  }

  @Post('discard')
  discard(@CurrentUser() user: AuthenticatedUser, @Body() dto: EngraveItemDto) {
    return this.engraveService.discard(user.userId, dto.itemId);
  }
}
