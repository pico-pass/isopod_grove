import { IsIn, IsString } from 'class-validator';
import { DUEL_ACTIONS } from '../game-engine';

export class BossDuelActDto {
  @IsString()
  @IsIn([...DUEL_ACTIONS])
  action: string;
}
