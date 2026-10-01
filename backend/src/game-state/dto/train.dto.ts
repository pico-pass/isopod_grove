import { IsInt, IsString, Max, Min } from 'class-validator';

export class TrainDto {
  @IsString()
  speciesId: string;

  // 훈련 강도: 0 가벼운 / 1 보통 / 2 강도 높은
  @IsInt()
  @Min(0)
  @Max(2)
  intensity: number;
}
