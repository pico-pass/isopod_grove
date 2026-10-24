import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ExhibitService } from './exhibit.service';
import { ExhibitCraftDto, ExhibitDisplayDto } from './dto/exhibit.dto';

// 표본 전시관
@Controller('game-state/exhibit')
@UseGuards(JwtAuthGuard)
export class ExhibitController {
  constructor(private readonly exhibitService: ExhibitService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.exhibitService.get(user.userId);
  }

  @Post('craft')
  craft(@CurrentUser() user: AuthenticatedUser, @Body() dto: ExhibitCraftDto) {
    return this.exhibitService.craft(user.userId, dto.speciesId);
  }

  @Post('display')
  display(@CurrentUser() user: AuthenticatedUser, @Body() dto: ExhibitDisplayDto) {
    return this.exhibitService.display(user.userId, dto.speciesId, dto.show);
  }

  @Post('shelf')
  shelf(@CurrentUser() user: AuthenticatedUser) {
    return this.exhibitService.expandShelf(user.userId);
  }
}
