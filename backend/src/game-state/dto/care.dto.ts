import { IsIn, IsOptional, IsString } from 'class-validator';

export type CareAction = 'feed' | 'mist' | 'climate';

export class CareDto {
  @IsIn(['feed', 'mist', 'climate'])
  action: CareAction;

  @IsOptional()
  @IsString()
  terrariumId?: string;
}
