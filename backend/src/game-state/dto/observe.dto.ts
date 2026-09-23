import { IsString } from 'class-validator';

export class ObserveDto {
  @IsString()
  speciesId: string;
}
