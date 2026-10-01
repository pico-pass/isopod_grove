import { IsInt, IsString, Max, Min } from 'class-validator';

export class BattleDto {
  @IsString()
  speciesId: string;

  // 난이도 = 상대 희귀도(0 일반 ~ 4 신화)
  @IsInt()
  @Min(0)
  @Max(4)
  difficulty: number;
}
