import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Mail, MailSchema } from './schemas/mail.schema';
import { UsersModule } from '../users/users.module';
import { GameStateModule } from '../game-state/game-state.module';
import { PushModule } from '../push/push.module';
import { MailService } from './mail.service';
import { AdminMailController, MailController } from './mail.controller';
import { AdminGuard } from '../admin/guards/admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Mail.name, schema: MailSchema }]),
    UsersModule,
    GameStateModule,
    PushModule,
  ],
  providers: [MailService, AdminGuard],
  exports: [MailService],
  controllers: [MailController, AdminMailController],
})
export class MailModule {}
