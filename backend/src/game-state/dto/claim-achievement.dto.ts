import { IsString } from 'class-validator';

export class ClaimAchievementDto {
  @IsString()
  achievementId: string;
}
