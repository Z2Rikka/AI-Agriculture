import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceSensorDataDto } from './dto/sensor-data-response.dto';

@Injectable()
export class SensorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestSensorDataForUser(userId: string): Promise<DeviceSensorDataDto[]> {
    // 1. 获取该用户绑定的所有设备
    const devices = await this.prisma.device.findMany({
      where: { userId },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        deviceType: true,
      },
    });

    if (devices.length === 0) {
      return [];
    }

    const result: DeviceSensorDataDto[] = [];

    // 2. 为每个设备查询最新的一条 SensorData
    for (const device of devices) {
      const latestData = await this.prisma.sensorData.findFirst({
        where: { deviceId: device.id },
        orderBy: { timestamp: 'desc' },
      });

      result.push({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        airTemperature: latestData?.airTemperature ?? null,
        airHumidity: latestData?.airHumidity ?? null,
        soilTemperature: latestData?.soilTemperature ?? null,
        soilHumidity: latestData?.soilHumidity ?? null,
        illuminance: latestData?.illuminance ?? null,
        batteryLevel: latestData?.batteryLevel ?? null,
        timestamp: latestData?.timestamp ?? null,
      });
    }

    return result;
  }
}
