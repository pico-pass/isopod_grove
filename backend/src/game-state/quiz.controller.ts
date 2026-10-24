import { Body, Controller, Get, Param, Post, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { QuizService } from './quiz.service';
import { QuizAnswerDto } from './dto/quiz.dto';

// 이 콩 누구?
@Controller('game-state/quiz')
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.quizService.get(user.userId);
  }

  @Post('start')
  start(@CurrentUser() user: AuthenticatedUser) {
    return this.quizService.start(user.userId);
  }

  @Post('answer')
  answer(@CurrentUser() user: AuthenticatedUser, @Body() dto: QuizAnswerDto) {
    return this.quizService.answer(user.userId, dto.speciesId);
  }
}

// 문제 그림. <img>가 직접 불러야 해서 로그인 토큰을 못 보내므로 인증 대신 "서버만 풀 수 있는 암호화된 일회용 주소"로 막는다(2분 뒤 만료).
@Controller('quiz-image')
export class QuizImageController {
  constructor(private readonly quizService: QuizService) {}

  @Get(':token')
  async image(@Param('token') token: string, @Res({ passthrough: true }) res: Response) {
    const file = await this.quizService.imagePath(token);
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=120', 'X-Content-Type-Options': 'nosniff' });
    return new StreamableFile(createReadStream(file));
  }
}
