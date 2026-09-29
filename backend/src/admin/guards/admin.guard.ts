import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from '../../users/users.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

// JwtAuthGuard 뒤에 붙여서 쓴다(@UseGuards(JwtAuthGuard, AdminGuard)).
// 관리자 여부는 토큰이 아니라 매 요청마다 DB에서 확인하므로, 권한을 뺏으면 즉시 반영된다.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    const isAdmin = await this.usersService.isAdmin(request.user.userId);
    if (!isAdmin) {
      throw new ForbiddenException('관리자만 접근할 수 있어요.');
    }
    return true;
  }
}
