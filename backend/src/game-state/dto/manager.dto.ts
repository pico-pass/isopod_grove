import { IsIn } from 'class-validator';
import { MANAGER_GRADES } from '../manager-engine';

export class ManagerHireDto {
  // 고용할 관리인 등급: rookie · skilled · veteran · master
  @IsIn(MANAGER_GRADES.map((g) => g.id))
  grade: string;
}
