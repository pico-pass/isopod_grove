import { IsInt, IsOptional, IsString, Min } from 'class-validator';

// itemId를 생략하면 장착하지 않은 모든 장비의 중복(복사본)을 분해한다. count를 생략하면 그 장비의 복사본을 전부 분해한다.
export class EquipmentDismantleDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;
}
