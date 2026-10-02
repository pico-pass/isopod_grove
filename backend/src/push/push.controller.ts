import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PushService } from './push.service';
import { SubscribePushDto, UnsubscribePushDto, UpdateNotificationPrefsDto } from './dto/push.dto';
import { UsersService } from '../users/users.service';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(
    private readonly pushService: PushService,
    private readonly usersService: UsersService,
  ) {}

  // 푸시를 쓸 수 있는지와 브라우저가 구독할 때 필요한 공개 키(비공개 키는 서버에만 있다)
  @Get('config')
  config() {
    return this.pushService.getConfig();
  }

  // 알림 종류별 설정(계정 전체에 적용: 푸시 알림과 화면 안의 알림 모두)
  @Get('preferences')
  preferences(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getNotificationPrefs(user.userId);
  }

  @Post('preferences')
  updatePreferences(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNotificationPrefsDto) {
    return this.usersService.setNotificationPrefs(user.userId, dto);
  }

  @Post('subscribe')
  subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubscribePushDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.pushService.subscribe(user.userId, { endpoint: dto.endpoint, keys: dto.keys }, userAgent);
  }

  @Post('unsubscribe')
  unsubscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UnsubscribePushDto) {
    return this.pushService.unsubscribe(user.userId, dto.endpoint);
  }
}
