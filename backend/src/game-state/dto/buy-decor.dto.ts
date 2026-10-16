import { IsNotEmpty, IsString } from 'class-validator';

export class BuyDecorDto {
  @IsString()
  @IsNotEmpty()
  decorId: string;
}
