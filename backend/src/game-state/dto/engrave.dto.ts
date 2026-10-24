import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EngraveItemDto {
  // 각인할 장비 id (가지고 있는 장비여야 한다)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  itemId: string;
}
