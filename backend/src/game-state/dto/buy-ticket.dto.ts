import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class BuyTicketDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  quantity?: number;
}
