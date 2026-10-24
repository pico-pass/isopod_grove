import { IsIn } from 'class-validator';
import { SKILL_LAB } from '../skill-lab-engine';

export class SkillLabUpgradeDto {
  // 올릴 연구: fire_burn · fire_turns · fire_cd · forest_cut · forest_turns · forest_cd · frost_hit · frost_cd
  @IsIn(SKILL_LAB.map((n) => n.id))
  id: string;
}
