import { IsString } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  targetUserId: string;
}
