import { IsOptional, IsString } from 'class-validator';

export class ExploreDto {
  @IsOptional()
  @IsString()
  terrariumId?: string;
}
