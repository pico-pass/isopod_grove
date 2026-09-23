import { IsString } from 'class-validator';

export class UpgradeDto {
  @IsString()
  upgradeId: string;
}
