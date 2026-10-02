import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EQUIPMENT_CATALOG } from './equipment.data';

@Controller('equipment')
@UseGuards(JwtAuthGuard)
export class EquipmentController {
  @Get()
  catalog() {
    return EQUIPMENT_CATALOG;
  }
}
