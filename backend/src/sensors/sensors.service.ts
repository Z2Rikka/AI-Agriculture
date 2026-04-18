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
    const deviceIds = devices.map((d) => d.id);

    // 2. 一次性查询所有设备最近的一条数据 (利用 distinct)
    const latestDataList = await this.prisma.sensorData.findMany({
      where: { deviceId: { in: deviceIds } },
      orderBy: { timestamp: 'desc' },
      distinct: ['deviceId'],
    });

    const dataMap = new Map(latestDataList.map((data) => [data.deviceId, data]));

    for (const device of devices) {
      const latestData = dataMap.get(device.id);

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
