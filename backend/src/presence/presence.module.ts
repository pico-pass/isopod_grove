import { Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PresenceService } from './presence.service';
import { PresenceController } from './presence.controller';

// @Global(): JwtAuthGuard가 PresenceService를 주입받는데, 그 가드는 거의 모든 모듈의
// 컨트롤러에서 @UseGuards(JwtAuthGuard)로 클래스째 직접 참조된다. 모듈마다 일일이
// PresenceModule을 import하지 않아도 되게 전역으로 등록한다.
@Global()
@Module({
  imports: [UsersModule],
  providers: [PresenceService],
  controllers: [PresenceController],
  exports: [PresenceService],
})
export class PresenceModule {}
