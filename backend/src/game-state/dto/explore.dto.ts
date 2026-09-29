import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ExploreDto {
  @IsOptional()
  @IsString()
  terrariumId?: string;

  // true면 골드 대신 숲 탐색권 1장을 사용한다.
  @IsOptional()
  @IsBoolean()
  useTicket?: boolean;
}
