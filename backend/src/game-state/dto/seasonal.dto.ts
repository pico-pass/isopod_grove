import { IsIn } from 'class-validator';
import { SEASONAL_EVENTS } from '../event-engine';

export class SeasonalGiftDto {
  // 선물을 받을 이벤트 id (예: chuseok)
  @IsIn(SEASONAL_EVENTS.map((e) => e.id))
  eventId: string;
}
