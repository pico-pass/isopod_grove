import { IsString, MaxLength } from 'class-validator';

export class QuizAnswerDto {
  // 고른 종 id. 시간이 다 돼서 못 골랐으면 빈 문자열을 보낸다.
  @IsString()
  @MaxLength(60)
  speciesId: string;
}
