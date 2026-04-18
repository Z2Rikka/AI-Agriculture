// devices/devices.service.ts
// 设备管理 + MQTT 状态上报处理

import { Injectable, OnModuleInit, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MqttClientService } from '../mqtt/mqtt-client.service';
import { CreateDeviceDto } from './dto/create-device.dto';

@Injectable()
export class DevicesService implements OnModuleInit {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mqtt: MqttClientService,
  ) {}

  // ============================================================
  // 生命周期：订阅 MQTT 状态主题，收到消息后更新数据库
  // ============================================================

  onModuleInit() {
    this.subscribeToMqttState();
  }

  /**
   * 监听 irrigation/+/state 主题，将遥测数据写入数据库
   * 设备上报格式（ESP32 固件需与此匹配）:
   * {
   *   "deviceId": "ESP32_001",
   *   "soilMoisture": 45.2,
   *   "temperature": 28.5,
   *   "humidity": 72.0,
   *   "valveState": "ON",
   *   "batteryLevel": 85
   * }
   */
  private subscribeToMqttState(): void {
    this.mqtt.getStateUpdates().subscribe({
      next: ({ topic, payload }) => {
        // Extract deviceId from topic: irrigation/{deviceId}/state
        const deviceId = topic.split('/')[1] ?? 'unknown';

        this.updateDeviceStatus(deviceId, payload).catch((err) =>
          this.logger.error(`[STATE] Failed to update device ${deviceId}: ${err?.message}`),
        );
      },
      error: (err) => {
        this.logger.error('[STATE] MQTT subscription error', err?.message);
      },
    });
  }

  /**
   * 更新设备在线状态和传感器数据
   * 如果设备不在数据库中（N+1 防护），自动忽略（不上报日志）
   */
  private async updateDeviceStatus(
    deviceId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      this.logger.debug(`[STATE] Unknown device ${deviceId} — ignoring`);
      return;
    }

    // 更新在线状态 + 最后在线时间
    await this.prisma.device.update({
      where: { deviceId },
      data: {
        isOnline: true,
        lastOnlineAt: new Date(),
      },
    });

    // 记录最新传感器数据到日志（取最新一条 IrrigationLog 的上下文）
    const latestLog = await this.prisma.irrigationLog.findFirst({
      where: { deviceId: device.id },
      orderBy: { issuedAt: 'desc' },
    });

    if (latestLog && latestLog.status === 'PENDING') {
      // 如果有一条 PENDING 的指令，设备响应后更新其传感器数据
      await this.prisma.irrigationLog.update({
        where: { id: latestLog.id },
        data: {
          soilMoisture: payload.soilMoisture as number | undefined,
          temperature: payload.temperature as number | undefined,
          humidity: payload.humidity as number | undefined,
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      });
    }
  }

  // ============================================================
  // 公开 API
  // ============================================================

  /**
   * 为当前用户创建设备
   */
  async create(userId: string, dto: CreateDeviceDto) {
    return this.prisma.device.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  /**
   * 获取当前用户的所有设备列表
   */
  async findAllByUser(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 获取指定设备详情（含归属校验）
   */
  async findOne(userId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { deviceId, userId },
    });

    if (!device) {
      throw new ForbiddenException('Device not found or access denied');
    }

    return device;
  }
}
