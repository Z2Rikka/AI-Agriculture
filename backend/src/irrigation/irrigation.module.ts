// irrigation/irrigation.module.ts
import { Module } from '@nestjs/common';
import { IrrigationController } from './irrigation.controller';
import { IrrigationService } from './irrigation.service';
import { RenkeCloudService } from './renke-cloud.service';
import { AuthModule } from '../auth/auth.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, MqttModule, PrismaModule],
  controllers: [IrrigationController],
  providers: [IrrigationService, RenkeCloudService],
})
export class IrrigationModule {}
