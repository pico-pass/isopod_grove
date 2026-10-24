import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class MerchantBuyDto {
  // 살 품목: ticket · shard · boost · decor
  @IsIn(['ticket', 'shard', 'boost', 'decor'])
  itemId: string;

  // 살 개수(기본 1, 하루 한정 개수는 서버가 다시 확인한다)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;
}
