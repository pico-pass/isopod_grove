import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PresenceService } from './presence.service';
import { UsersService, effectiveDisplayName } from '../users/users.service';

@Controller('presence')
@UseGuards(JwtAuthGuard)
export class PresenceController {
  constructor(
    private readonly presenceService: PresenceService,
    private readonly usersService: UsersService,
  ) {}

  @Get('online')
  async online() {
    const ids = this.presenceService.getOnlineUserIds();
    const users = await this.usersService.findByIds(ids);
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    const players = ids
      .map((id) => userById.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => ({
        userId: u._id.toString(),
        displayName: effectiveDisplayName(u),
        avatarUrl: u.avatarUrl,
      }));

    return { count: players.length, players };
  }
}
