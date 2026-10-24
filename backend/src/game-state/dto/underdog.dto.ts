import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UnderdogEnterDto {
  // 이번 주 출전할 식구(희귀도 '일반' 종)
  @IsString()
  @MaxLength(60)
  speciesId: string;
}

export class UnderdogMatchDto {
  // 겨룰 출전자의 유저 id. 비우면 야생 선수와 겨룬다.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  opponentUserId?: string;
}
