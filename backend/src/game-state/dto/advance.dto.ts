import { IsInt, Min } from 'class-validator';

export class AdvanceDto {
  @IsInt()
  @Min(0)
  seconds: number;
}
