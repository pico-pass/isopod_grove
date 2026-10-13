import { IsBoolean, IsString } from 'class-validator';

export class SetSpeciesLockDto {
  @IsString()
  speciesId: string;

  @IsBoolean()
  locked: boolean;
}
