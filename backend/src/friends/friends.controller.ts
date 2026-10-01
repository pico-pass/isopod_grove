import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { FriendRequestIdDto } from './dto/friend-request-id.dto';
import { FriendUserDto } from './dto/friend-user.dto';
import { SearchUsersDto } from './dto/search-users.dto';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.list(user.userId);
  }

  @Get('search')
  search(@CurrentUser() user: AuthenticatedUser, @Query() dto: SearchUsersDto) {
    return this.friendsService.search(user.userId, dto.query);
  }

  @Post('request')
  sendRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(user.userId, dto.targetUserId);
  }

  @Post('accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Body() dto: FriendRequestIdDto) {
    return this.friendsService.accept(user.userId, dto.requestId);
  }

  @Post('decline')
  decline(@CurrentUser() user: AuthenticatedUser, @Body() dto: FriendRequestIdDto) {
    return this.friendsService.decline(user.userId, dto.requestId);
  }

  @Post('remove')
  remove(@CurrentUser() user: AuthenticatedUser, @Body() dto: FriendUserDto) {
    return this.friendsService.remove(user.userId, dto.friendUserId);
  }

  @Post('gift')
  gift(@CurrentUser() user: AuthenticatedUser, @Body() dto: FriendUserDto) {
    return this.friendsService.gift(user.userId, dto.friendUserId);
  }
}
