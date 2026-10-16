import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class VisitLikeDto {
  @IsString()
  @IsNotEmpty()
  terrariumId: string;

  // true면 좋아요, false면 취소. 같은 값을 여러 번 보내도 결과가 같다.
  @IsBoolean()
  liked: boolean;
}
