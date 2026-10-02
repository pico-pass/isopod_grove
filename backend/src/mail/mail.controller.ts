import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MailService } from './mail.service';
import { AdminSendMailDto } from './dto/admin-send-mail.dto';

// 유저용 우편함. 정적 경로(summary, claim-all)를 :id 경로보다 먼저 선언한다.
@Controller('mail')
@UseGuards(JwtAuthGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.mailService.list(user.userId);
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.mailService.summary(user.userId);
  }

  @Post('claim-all')
  claimAll(@CurrentUser() user: AuthenticatedUser) {
    return this.mailService.claimAll(user.userId);
  }

  @Post(':id/claim')
  claim(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mailService.claim(user.userId, id);
  }

  @Post(':id/read')
  read(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mailService.markRead(user.userId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mailService.remove(user.userId, id);
  }
}

// 관리자용 우편 발송. 관리자 여부는 AdminGuard가 매 요청마다 DB에서 확인한다.
@Controller('admin/mail')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminMailController {
  constructor(private readonly mailService: MailService) {}

  @Post()
  send(@CurrentUser() user: AuthenticatedUser, @Body() dto: AdminSendMailDto) {
    return this.mailService.send(user.userId, dto);
  }

  @Get()
  history() {
    return this.mailService.history();
  }

  @Get('users')
  searchUsers(@Query('query') query = '') {
    return this.mailService.searchUsers(query);
  }
}
