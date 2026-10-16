import { IsBoolean } from 'class-validator';

export class TerrariumPublicDto {
  @IsBoolean()
  isPublic: boolean;
}
