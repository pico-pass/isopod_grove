import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RunnerStartDto {
  // 내보낼 콩벌레(종). 가지고 있는 종이어야 하고, 희귀도에 따라 능력이 달라진다.
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  speciesId: string;
}
