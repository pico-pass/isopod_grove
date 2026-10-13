import { IsInt, IsString, Max, Min } from 'class-validator';
import { RARITIES } from '../../species/species.seed-data';

export class BattleDuelStartDto {
  @IsString()
  speciesId: string;

  // 상대 희귀도(0~4)
  @IsInt()
  @Min(0)
  @Max(RARITIES.length - 1)
  difficulty: number;
}
