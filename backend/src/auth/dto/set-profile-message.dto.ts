import { IsString, MaxLength } from 'class-validator';

export class SetProfileMessageDto {
  // 빈 문자열이면 메시지를 지운다.
  @IsString()
  @MaxLength(60)
  message: string;
}
