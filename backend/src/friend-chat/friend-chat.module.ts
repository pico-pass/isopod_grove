import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendMessage, FriendMessageSchema } from './schemas/friend-message.schema';
import { FriendChatReport, FriendChatReportSchema } from './schemas/friend-chat-report.schema';
import { Friendship, FriendshipSchema } from '../friends/schemas/friendship.schema';
import { UsersModule } from '../users/users.module';
import { PushModule } from '../push/push.module';
import { MailModule } from '../mail/mail.module';
import { AdminGuard } from '../admin/guards/admin.guard';
import { FriendChatService } from './friend-chat.service';
import { AdminChatBanController, AdminFriendChatController, FriendChatController } from './friend-chat.controller';

// PresenceService는 전역 모듈(PresenceModule)이라 따로 import하지 않는다.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FriendMessage.name, schema: FriendMessageSchema },
      { name: FriendChatReport.name, schema: FriendChatReportSchema },
      // 친구 관계 확인 전용. FriendsModule을 import하지 않고 모델만 직접 가져온다.
      { name: Friendship.name, schema: FriendshipSchema },
    ]),
    UsersModule,
    PushModule,
    MailModule,
  ],
  providers: [FriendChatService, AdminGuard],
  controllers: [FriendChatController, AdminFriendChatController, AdminChatBanController],
})
export class FriendChatModule {}
