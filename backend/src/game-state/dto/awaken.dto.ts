import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AwakenDto {
  // 각성할 식구(종). 지금 키우고 있고 전투 레벨이 각성 가능 레벨 이상이어야 한다.
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  speciesId: string;
}
