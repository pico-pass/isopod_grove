import { IsInt, IsString, Max, Min } from 'class-validator';

export class EquipmentEquipDto {
  @IsInt()
  @Min(0)
  @Max(4)
  slotIndex: number;

  // 빈 문자열이면 그 슬롯을 비운다(해제).
  @IsString()
  itemId: string;
}
