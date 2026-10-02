import { IsIn } from 'class-validator';

export class EquipmentPullDto {
  // 1회 또는 10연차
  @IsIn([1, 10])
  count: number;
}
