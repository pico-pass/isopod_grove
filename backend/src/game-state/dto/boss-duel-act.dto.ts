import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { DUEL_ACTIONS } from '../game-engine';

export class BossDuelActDto {
  @IsString()
  @IsIn([...DUEL_ACTIONS])
  action: string;

  // 리듬 일격: 강력한 일격을 타이밍 바로 쏜 정확도(0~1, 가운데일수록 1). 일격이 아니면 무시한다.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  rhythm?: number;
}
