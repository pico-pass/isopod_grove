import { ArrayMaxSize, IsArray, IsInt, Max, Min } from 'class-validator';
import { RUNNER_MAX_JUMPS, RUNNER_MAX_TICKS } from '../runner-engine';

export class RunnerFinishDto {
  // 점프한 틱 번호들(오름차순, 중복 없음). 게임이 시작된 틱이 0이다. 순서·중복은 서버가 한 번 더 확인한다.
  @IsArray()
  @ArrayMaxSize(RUNNER_MAX_JUMPS)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(RUNNER_MAX_TICKS - 1, { each: true })
  jumps: number[];
}
