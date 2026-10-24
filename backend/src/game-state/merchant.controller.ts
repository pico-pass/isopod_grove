import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MerchantService } from './merchant.service';
import { MerchantBuyDto } from './dto/merchant.dto';

// 떠돌이 상인
@Controller('game-state/merchant')
@UseGuards(JwtAuthGuard)
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.merchantService.get(user.userId);
  }

  @Post('buy')
  buy(@CurrentUser() user: AuthenticatedUser, @Body() dto: MerchantBuyDto) {
    return this.merchantService.buy(user.userId, dto.itemId, dto.count ?? 1);
  }
}
