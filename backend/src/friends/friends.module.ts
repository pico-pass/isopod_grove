import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Friendship, FriendshipSchema } from './schemas/friendship.schema';
import { UsersModule } from '../users/users.module';
import { GameStateModule } from '../game-state/game-state.module';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Friendship.name, schema: FriendshipSchema },
    ]),
    UsersModule,
    GameStateModule,
  ],
  providers: [FriendsService],
  controllers: [FriendsController],
})
export class FriendsModule {}
