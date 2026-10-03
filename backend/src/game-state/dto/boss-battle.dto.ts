import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { BOSS_DIFFICULTY_IDS, BOSS_FLOOR_COUNT } from '../game-engine';

export class BossBattleDto {
  @IsString()
  speciesId: string;

  @IsInt()
  @Min(1)
  @Max(BOSS_FLOOR_COUNT)
  floor: number;

  // 생략하면 쉬움(난이도가 없던 때의 요청과 같다)
  @IsOptional()
  @IsIn(BOSS_DIFFICULTY_IDS)
  difficulty?: string;
}
