import { IsString } from 'class-validator';

export class PvpSetDefenseDto {
  @IsString()
  speciesId: string;
}
