import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { SpeciesService } from './species.service';

@Controller('species')
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Get()
  findAll() {
    return this.speciesService.findAll();
  }

  @Get(':speciesId')
  async findOne(@Param('speciesId') speciesId: string) {
    const species = await this.speciesService.findOne(speciesId);
    if (!species) throw new NotFoundException('존재하지 않는 종이에요.');
    return species;
  }
}
