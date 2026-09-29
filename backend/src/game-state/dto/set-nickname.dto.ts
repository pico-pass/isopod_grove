import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetNicknameDto {
  @IsString()
  @MinLength(2)
  @MaxLength(12)
  nickname: string;
}
