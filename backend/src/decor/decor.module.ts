import { Module } from '@nestjs/common';
import { DecorController } from './decor.controller';

@Module({
  controllers: [DecorController],
})
export class DecorModule {}
