// mqtt/mqtt.module.ts
import { Module } from '@nestjs/common';
import { MqttClientService } from './mqtt-client.service';

@Module({
  providers: [MqttClientService],
  exports: [MqttClientService],
})
export class MqttModule {}
