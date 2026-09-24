import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SellDto {
  @IsString()
  speciesId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  terrariumId?: string;
}
