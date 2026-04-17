// devices/devices.module.ts
import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { AuthModule } from '../auth/auth.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [AuthModule, MqttModule],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
