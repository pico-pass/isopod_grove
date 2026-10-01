import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { CHAT_CHANNELS } from '../schemas/chat-message.schema';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  text: string;

  @IsIn(CHAT_CHANNELS)
  channel: string;
}
