import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ShopSimService } from './shop-sim.service';
import { ShopSimRunDto } from './dto/shop-sim.dto';
import type { ShopPlanItem, ShopProductId } from './shop-sim-engine';

// 버섯 가게 운영
@Controller('game-state/shop-sim')
@UseGuards(JwtAuthGuard)
export class ShopSimController {
  constructor(private readonly shopSimService: ShopSimService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.shopSimService.get(user.userId);
  }

  @Post('run')
  run(@CurrentUser() user: AuthenticatedUser, @Body() dto: ShopSimRunDto) {
    const plan: ShopPlanItem[] = dto.plan.map((p) => ({ productId: p.productId as ShopProductId, stock: p.stock, price: p.price }));
    return this.shopSimService.run(user.userId, plan, dto.practice === true);
  }
}
