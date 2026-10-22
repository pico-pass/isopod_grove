import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DUNGEON_DIFFICULTY_IDS } from '../dungeon-engine';

export class DungeonStartDto {
  // 내보낼 식구(종). 가지고 있는 종이어야 한다.
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  speciesId: string;

  @IsIn([...DUNGEON_DIFFICULTY_IDS])
  difficulty: string;
}

export class DungeonChooseDto {
  // 지금 단계의 선택: 방 번호('0'~'2') / 유물 id 또는 'skip' / 이벤트 선택 id / 'buy:유물id'·'potion'·'leave' / 'heal'·'atk'·'def'·'hp'
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  choice: string;
}
