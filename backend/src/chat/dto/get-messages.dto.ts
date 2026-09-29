import { IsMongoId, IsOptional } from 'class-validator';

export class GetMessagesDto {
  // 이 id 이후의 메시지만 가져온다. 없으면 최근 메시지 목록을 가져온다.
  @IsOptional()
  @IsMongoId()
  after?: string;
}
