import { Module } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { SensorsController } from './sensors.controller';

@Module({
  imports: [],
  providers: [SensorsService],
  controllers: [SensorsController]
})
export class SensorsModule {}
