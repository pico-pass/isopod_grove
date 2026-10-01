import { IsString } from 'class-validator';

export class PvpBattleDto {
  @IsString()
  speciesId: string;

  @IsString()
  opponentUserId: string;
}
