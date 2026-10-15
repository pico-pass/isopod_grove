import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PUZZLE_MAX_MOVES, PUZZLE_STAGES } from '../puzzle-engine';

export class PuzzleSubmitDto {
  // 푼 퍼즐의 날짜(YYYY-MM-DD). 자정이 지나 퍼즐이 바뀐 뒤에 낡은 판의 기록이 들어오는 걸 막는다.
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dayKey: string;

  // 푼 단계(1부터). 앞 단계를 깨야 열린다.
  @IsInt()
  @Min(1)
  @Max(PUZZLE_STAGES)
  stage: number;

  // 이동 기록: U(위) D(아래) L(왼쪽) R(오른쪽)을 순서대로 이은 문자열
  @IsString()
  @MaxLength(PUZZLE_MAX_MOVES)
  @Matches(/^[UDLR]+$/)
  moves: string;
}
