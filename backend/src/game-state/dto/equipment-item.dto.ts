import { IsString } from 'class-validator';

export class EquipmentItemDto {
  @IsString()
  itemId: string;
}
