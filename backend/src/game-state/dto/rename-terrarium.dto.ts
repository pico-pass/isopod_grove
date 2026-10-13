import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TERRARIUM_NAME_MAX_LENGTH } from '../game-engine';

export class RenameTerrariumDto {
  @IsString()
  @IsNotEmpty()
  terrariumId: string;

  @IsString()
  @MaxLength(TERRARIUM_NAME_MAX_LENGTH)
  name: string;
}
