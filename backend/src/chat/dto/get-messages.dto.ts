import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import { CHAT_CHANNELS } from '../schemas/chat-message.schema';

export class GetMessagesDto {
  // 이 id 이후의 메시지만 가져온다. 없으면 최근 메시지 목록을 가져온다.
  @IsOptional()
  @IsMongoId()
  after?: string;

  // 없으면 자유방(기본 채널)으로 본다.
  @IsOptional()
  @IsIn(CHAT_CHANNELS)
  channel?: string;
}
