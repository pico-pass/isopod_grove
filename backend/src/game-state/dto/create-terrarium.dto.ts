import { IsOptional, IsString, MaxLength } from 'class-validator';
import { TERRARIUM_NAME_MAX_LENGTH } from '../game-engine';

export class CreateTerrariumDto {
  @IsOptional()
  @IsString()
  @MaxLength(TERRARIUM_NAME_MAX_LENGTH)
  name?: string;
}
