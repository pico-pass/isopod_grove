import { IsString } from 'class-validator';

export class ClaimDto {
  @IsString()
  questId: string;
}
