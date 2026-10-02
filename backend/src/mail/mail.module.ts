import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Mail, MailSchema } from './schemas/mail.schema';
import { UsersModule } from '../users/users.module';
import { GameStateModule } from '../game-state/game-state.module';
import { MailService } from './mail.service';
import { AdminMailController, MailController } from './mail.controller';
import { AdminGuard } from '../admin/guards/admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Mail.name, schema: MailSchema }]),
    UsersModule,
    GameStateModule,
  ],
  providers: [MailService, AdminGuard],
  controllers: [MailController, AdminMailController],
})
export class MailModule {}
