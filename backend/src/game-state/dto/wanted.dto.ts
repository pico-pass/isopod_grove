import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { WANTED_TIERS } from '../wanted-engine';

export class WantedStartDto {
  // 내보낼 식구(종). 가지고 있는 종이고 오늘의 출전 조건에 맞아야 한다.
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  speciesId: string;

  // 도전할 등급: bronze(동) · silver(은) · gold(금)
  @IsIn(WANTED_TIERS.map((t) => t.id))
  tier: string;
}
