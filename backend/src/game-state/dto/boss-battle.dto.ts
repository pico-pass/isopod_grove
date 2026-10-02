import { IsInt, IsString, Max, Min } from 'class-validator';
import { BOSS_FLOOR_COUNT } from '../game-engine';

export class BossBattleDto {
  @IsString()
  speciesId: string;

  @IsInt()
  @Min(1)
  @Max(BOSS_FLOOR_COUNT)
  floor: number;
}
