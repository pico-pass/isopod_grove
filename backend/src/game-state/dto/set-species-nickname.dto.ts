import { IsString, MaxLength } from 'class-validator';
import { SPECIES_NICKNAME_MAX_LENGTH } from '../game-engine';

export class SetSpeciesNicknameDto {
  @IsString()
  speciesId: string;

  // 빈 문자열이면 기본 이름으로 되돌린다.
  @IsString()
  @MaxLength(SPECIES_NICKNAME_MAX_LENGTH)
  nickname: string;
}
