import { IsIn, IsOptional, IsString } from 'class-validator';
import { SURVIVAL_BUFF_IDS, SURVIVAL_MODES } from '../game-engine';

export class SurvivalStartDto {
  @IsString()
  speciesId: string;

  // 생략하면 'auto'(구간을 자동으로 진행). 'direct'면 일반 스테이지는 자동으로, 엘리트는 직접 전투로 진행한다.
  @IsOptional()
  @IsIn([...SURVIVAL_MODES])
  mode?: string;
}

export class SurvivalChooseDto {
  @IsIn(SURVIVAL_BUFF_IDS)
  buffId: string;
}
