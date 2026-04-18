// app.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MqttModule } from './mqtt/mqtt.module';
import { UsersModule } from './users/users.module';
import { DevicesModule } from './devices/devices.module';
import { IrrigationModule } from './irrigation/irrigation.module';
import { SensorsModule } from './sensors/sensors.module';

@Module({
  imports: [
    PrismaModule,   // 全局数据库服务
    AuthModule,     // API Key 鉴权
    MqttModule,     // MQTT 通信
    UsersModule,    // 用户管理
    DevicesModule,  // 设备管理
    IrrigationModule, SensorsModule, // 灌溉控制
  ],
})
export class AppModule {}
