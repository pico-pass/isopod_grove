import { IsString } from 'class-validator';

export class FriendUserDto {
  @IsString()
  friendUserId: string;
}
