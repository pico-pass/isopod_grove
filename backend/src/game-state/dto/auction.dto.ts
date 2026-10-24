import { IsInt, Max, Min } from 'class-validator';
import { AUCTION_LOT_COUNT, AUCTION_MAX_BID } from '../auction-engine';

export class AuctionBidDto {
  // 입찰할 물건 번호(0부터)
  @IsInt()
  @Min(0)
  @Max(AUCTION_LOT_COUNT - 1)
  lot: number;

  // 입찰 금액(골드). 내가 이미 최고가면 이번에 올릴 총액.
  @IsInt()
  @Min(1)
  @Max(AUCTION_MAX_BID)
  amount: number;
}
