import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SellDto {
  @IsString()
  speciesId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  terrariumId?: string;

  // 이 분양으로 계정 전체의 그 종이 0마리가 될 때만 필요하다. 마지막 개체까지 파는 걸 확인했다는 뜻이다.
  @IsOptional()
  @IsBoolean()
  confirmLast?: boolean;
}
