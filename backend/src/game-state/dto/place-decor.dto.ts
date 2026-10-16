import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { DECOR_PROP_SLOTS } from '../../decor/decor.data';

export class PlaceDecorDto {
  @IsString()
  @IsNotEmpty()
  terrariumId: string;

  @IsIn(['backdrop', 'prop'])
  kind: 'backdrop' | 'prop';

  // 소품 칸 번호(0부터). 배경은 보내지 않는다.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(DECOR_PROP_SLOTS - 1)
  index?: number;

  // 놓을 장식. 비우면(보내지 않으면) 그 칸을 치운다.
  @IsOptional()
  @IsString()
  decorId?: string;
}
