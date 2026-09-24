import { IsString } from 'class-validator';

export class MoveSpeciesDto {
  @IsString()
  speciesId: string;

  @IsString()
  fromTerrariumId: string;

  @IsString()
  toTerrariumId: string;
}
