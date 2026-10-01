import { IsMongoId } from 'class-validator';

export class FriendRequestIdDto {
  @IsMongoId()
  requestId: string;
}
