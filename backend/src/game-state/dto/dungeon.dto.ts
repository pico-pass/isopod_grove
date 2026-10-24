import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { DUNGEON_DIFFICULTY_IDS, DUNGEON_LAB, DUNGEON_SUPPLIES } from '../dungeon-engine';

// 출정 준비물 개수(없는 항목은 0). 최대 개수는 서버가 다시 자른다.
export class DungeonSuppliesDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(DUNGEON_SUPPLIES.find((s) => s.id === 'relic')!.max)
  relic?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(DUNGEON_SUPPLIES.find((s) => s.id === 'mushrooms')!.max)
  mushrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(DUNGEON_SUPPLIES.find((s) => s.id === 'scout')!.max)
  scout?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(DUNGEON_SUPPLIES.find((s) => s.id === 'reroll')!.max)
  reroll?: number;
}

export class DungeonStartDto {
  // 내보낼 식구(종). 가지고 있는 종이어야 한다.
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  speciesId: string;

  @IsIn([...DUNGEON_DIFFICULTY_IDS])
  difficulty: string;

  // 출정 준비물(선택)과 결제 수단('gold' 기본, 'diamond')
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DungeonSuppliesDto)
  supplies?: DungeonSuppliesDto;

  @IsOptional()
  @IsIn(['gold', 'diamond'])
  pay?: 'gold' | 'diamond';
}

export class DungeonLabDto {
  // 올릴 던전 연구: offer · shop · hp · rest · gold · discount
  @IsIn(DUNGEON_LAB.map((l) => l.id))
  id: string;
}

export class DungeonChooseDto {
  // 지금 단계의 선택: 방 번호('0'~'2') / 유물 id 또는 'skip' / 이벤트 선택 id / 'buy:유물id'·'potion'·'leave' / 'heal'·'atk'·'def'·'hp'
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  choice: string;
}

export class DungeonGuardianDto {
  // 문지기로 세울 식구(종). 빈 문자열이면 문지기를 내린다.
  @IsString()
  @MaxLength(60)
  speciesId: string;
}
