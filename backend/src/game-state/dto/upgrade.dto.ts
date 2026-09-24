import { IsOptional, IsString } from 'class-validator';

export class UpgradeDto {
  @IsString()
  upgradeId: string;

  // 공간 확장처럼 사육장별로 적용되는 업그레이드에서 대상 사육장을 지정한다.
  @IsOptional()
  @IsString()
  terrariumId?: string;
}
