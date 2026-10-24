import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { STACK_MAX_DELAY, STACK_MAX_DROPS, STACK_MIN_DELAY } from '../stack-engine';

export class StackStartDto {
  // 내보낼 콩벌레(종). 가지고 있는 종이어야 하고, 희귀도에 따라 퍼펙트 허용치가 달라진다.
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  speciesId: string;
}

export class StackFinishDto {
  // 통나무마다 "나온 뒤 몇 틱 만에 떨어뜨렸는지". 서버가 같은 시뮬레이션을 처음부터 다시 돌려 높이를 정한다.
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(STACK_MAX_DROPS)
  @IsInt({ each: true })
  @Min(STACK_MIN_DELAY, { each: true })
  @Max(STACK_MAX_DELAY, { each: true })
  delays: number[];
}
