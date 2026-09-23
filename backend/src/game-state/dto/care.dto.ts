import { IsIn } from 'class-validator';

export type CareAction = 'feed' | 'mist' | 'climate';

export class CareDto {
  @IsIn(['feed', 'mist', 'climate'])
  action: CareAction;
}
