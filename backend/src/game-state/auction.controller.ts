import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuctionService } from './auction.service';
import { AuctionBidDto } from './dto/auction.dto';

// 매일 경매
@Controller('game-state/auction')
@UseGuards(JwtAuthGuard)
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.auctionService.get(user.userId);
  }

  @Post('bid')
  bid(@CurrentUser() user: AuthenticatedUser, @Body() dto: AuctionBidDto) {
    return this.auctionService.bid(user.userId, dto.lot, dto.amount);
  }

  @Post('claim')
  claim(@CurrentUser() user: AuthenticatedUser) {
    return this.auctionService.claim(user.userId);
  }
}
