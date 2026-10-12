import { IsIn, IsInt } from 'class-validator';
import { BOOST_KINDS, BOOST_OFFERS } from '../game-engine';

export class BuyBoostDto {
  @IsIn([...BOOST_KINDS])
  kind: string;

  @IsInt()
  @IsIn(BOOST_OFFERS.map((o) => o.hours))
  hours: number;
}
