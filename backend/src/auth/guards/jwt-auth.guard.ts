import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PresenceService } from '../../presence/presence.service';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly presenceService: PresenceService) {
    super();
  }

  // 인증에 성공할 때마다 "방금 활동함"으로 기록한다. 현재 접속자 목록은 이 기록을 읽는다.
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    const authenticated = super.handleRequest(err, user, info, context, status);
    const userId = (authenticated as AuthenticatedUser)?.userId;
    if (userId) this.presenceService.touch(userId);
    return authenticated;
  }
}
