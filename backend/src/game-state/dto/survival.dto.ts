import { IsIn, IsString } from 'class-validator';
import { SURVIVAL_BUFF_IDS } from '../game-engine';

export class SurvivalStartDto {
  @IsString()
  speciesId: string;
}

export class SurvivalChooseDto {
  @IsIn(SURVIVAL_BUFF_IDS)
  buffId: string;
}
