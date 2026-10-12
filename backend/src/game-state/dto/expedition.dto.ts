import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { EXPEDITION_TIERS } from '../game-engine';

export class ExpeditionDto {
  @IsInt()
  @IsIn(EXPEDITION_TIERS.map((t) => t.tier))
  tier: number;

  @IsOptional()
  @IsString()
  terrariumId?: string;
}
