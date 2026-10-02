import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { FriendChatService } from './friend-chat.service';
import {
  FriendIdParamDto,
  FriendMessageParamDto,
  GetFriendMessagesDto,
  ListReportsDto,
  ReportFriendMessageDto,
  ReportIdParamDto,
  ResolveReportDto,
  SendFriendMessageDto,
  UserIdParamDto,
} from './dto/friend-chat.dto';

@Controller('friend-chat')
@UseGuards(JwtAuthGuard)
export class FriendChatController {
  constructor(private readonly friendChatService: FriendChatService) {}

  // 정적 경로(unread, reports)를 :friendId 경로보다 먼저 선언한다.
  @Get('unread')
  unread(@CurrentUser() user: AuthenticatedUser) {
    return this.friendChatService.getUnread(user.userId);
  }

  @Post('reports')
  report(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReportFriendMessageDto) {
    return this.friendChatService.reportMessage(user.userId, dto.messageId, dto.reason, dto.detail);
  }

  @Get(':friendId/messages')
  getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: FriendIdParamDto,
    @Query() query: GetFriendMessagesDto,
  ) {
    return this.friendChatService.getMessages(user.userId, params.friendId, query.after);
  }

  @Post(':friendId/messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: FriendIdParamDto,
    @Body() dto: SendFriendMessageDto,
  ) {
    return this.friendChatService.sendMessage(user.userId, params.friendId, dto.text);
  }

  @Delete(':friendId/messages/:messageId')
  deleteMessage(@CurrentUser() user: AuthenticatedUser, @Param() params: FriendMessageParamDto) {
    return this.friendChatService.deleteMessage(user.userId, params.friendId, params.messageId);
  }
}

// 관리자용 신고 처리. 관리자 여부는 AdminGuard가 매 요청마다 DB에서 확인한다.
@Controller('admin/friend-chat/reports')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminFriendChatController {
  constructor(private readonly friendChatService: FriendChatService) {}

  @Get()
  list(@Query() query: ListReportsDto) {
    return this.friendChatService.listReports(query.status);
  }

  @Post(':reportId/resolve')
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ReportIdParamDto,
    @Body() dto: ResolveReportDto,
  ) {
    return this.friendChatService.resolveReport(
      user.userId,
      params.reportId,
      dto.status,
      dto.adminNote,
      dto.banDays,
      dto.notify,
    );
  }
}

// 채팅 정지 중인 유저 관리(목록과 해제). 정지는 신고를 처리하면서 건다.
@Controller('admin/chat-bans')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminChatBanController {
  constructor(private readonly friendChatService: FriendChatService) {}

  @Get()
  list() {
    return this.friendChatService.listBans();
  }

  @Post(':userId/lift')
  lift(@CurrentUser() user: AuthenticatedUser, @Param() params: UserIdParamDto) {
    return this.friendChatService.liftBan(user.userId, params.userId);
  }
}
