import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ExhibitCraftDto {
  // 표본을 만들거나 등급을 올릴 종
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  speciesId: string;
}

export class ExhibitDisplayDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  speciesId: string;

  // true면 진열, false면 내리기
  @IsBoolean()
  show: boolean;
}
