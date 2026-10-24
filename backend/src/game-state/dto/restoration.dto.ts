import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { RESTORATION_MILESTONES, RESTORATION_PERSONAL } from '../restoration-engine';

export class RestorationClaimDto {
  // 받을 보상: 공동 마일스톤(m25…) 또는 개인 공헌(p30…)
  @IsIn([...RESTORATION_MILESTONES.map((m) => m.id), ...RESTORATION_PERSONAL.map((p) => p.id)])
  id: string;

  // true면 지난 주 보상
  @IsOptional()
  @IsBoolean()
  last?: boolean;
}
