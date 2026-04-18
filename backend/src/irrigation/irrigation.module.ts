// irrigation/irrigation.module.ts
import { Module } from '@nestjs/common';
import { IrrigationController } from './irrigation.controller';
import { IrrigationService } from './irrigation.service';
import { RenkeCloudService } from './renke-cloud.service';
import { AuthModule } from '../auth/auth.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [AuthModule, MqttModule],
  controllers: [IrrigationController],
  providers: [IrrigationService, RenkeCloudService],
})
export class IrrigationModule {}
