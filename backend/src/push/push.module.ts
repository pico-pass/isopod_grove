import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PushSubscription, PushSubscriptionSchema } from './schemas/push-subscription.schema';
import { UsersModule } from '../users/users.module';
import { PushService } from './push.service';
import { PushController } from './push.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PushSubscription.name, schema: PushSubscriptionSchema }]),
    UsersModule,
  ],
  providers: [PushService],
  controllers: [PushController],
  exports: [PushService],
})
export class PushModule {}
