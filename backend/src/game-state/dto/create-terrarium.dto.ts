import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTerrariumDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  name?: string;
}
