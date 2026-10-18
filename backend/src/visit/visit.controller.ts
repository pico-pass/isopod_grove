import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { VisitLikeDto } from './dto/visit-like.dto';
import { VisitService } from './visit.service';

@Controller('visit')
@UseGuards(JwtAuthGuard)
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  // ':userId'보다 먼저 선언해야 'random'·'summary'가 유저 id로 읽히지 않는다.
  @Get('random')
  random(@CurrentUser() user: AuthenticatedUser) {
    return this.visitService.getRandomTarget(user.userId);
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.visitService.getSummary(user.userId);
  }

  // 'me'는 내 사육장이다(푸시 알림을 눌러 들어올 때 내 id를 몰라도 열 수 있게).
  @Get(':userId')
  visit(@CurrentUser() user: AuthenticatedUser, @Param('userId') ownerId: string) {
    return this.visitService.getVisit(user.userId, ownerId === 'me' ? user.userId : ownerId);
  }

  @Post(':userId/like')
  like(@CurrentUser() user: AuthenticatedUser, @Param('userId') ownerId: string, @Body() dto: VisitLikeDto) {
    return this.visitService.setLike(user.userId, ownerId, dto.terrariumId, dto.liked);
  }
}
