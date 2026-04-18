// irrigation/irrigation.service.ts
// 灌溉核心业务逻辑：
// 1. 验证设备归属（用户只能操作自己名下的设备）
// 2. 通过 MQTT 发布指令
// 3. 写入 IrrigationLog 审计日志

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MqttClientService } from '../mqtt/mqtt-client.service';
import { ValveControlDto, ValveControlResponseDto } from './dto/valve-control.dto';

@Injectable()
export class IrrigationService {
  private readonly logger = new Logger(IrrigationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mqtt: MqttClientService,
  ) {}

  /**
   * 执行阀门控制：OpenClaw / AI Agent 的主入口
   *
   * 鉴权流程（已在 Guard 层完成，本方法只业务逻辑）：
   *   Bearer API_KEY → 查询 User → 确认 Device 归属该 User → MQTT 发布
   */
  async controlValve(
    userId: string,
    dto: ValveControlDto,
  ): Promise<ValveControlResponseDto> {
    const { command, deviceId, waterVolumeMl, durationSec, triggerBy } = dto;

    // ----------------------------------------------------------
    // Step 1: 确定目标设备
    //   - 如果请求中带了 deviceId，验证该设备是否属于当前用户
    //   - 如果没带 deviceId，自动取用户名下的第一台设备
    // ----------------------------------------------------------
    const targetDevice = await this.resolveDevice(userId, deviceId);

    if (!targetDevice) {
      throw new NotFoundException('Device not found or not bound to your account');
    }

    // ----------------------------------------------------------
    // Step 2: 构建 MQTT 主题并发布指令
    //   主题格式: irrigation/{deviceId}/command
    // ----------------------------------------------------------
    const topic = `irrigation/${targetDevice.deviceId}/command`;
    const extendedPayload: Record<string, unknown> = {
      command,
      issuedBy: triggerBy ?? userId,
      timestamp: new Date().toISOString(),
    };

    // 如果携带了水量或时长，附加到 payload 中
    if (waterVolumeMl !== undefined) {
      extendedPayload.waterVolumeMl = waterVolumeMl;
    }
    if (durationSec !== undefined) {
      extendedPayload.durationSec = durationSec;
    }

    this.mqtt.publish(topic, extendedPayload);

    // ----------------------------------------------------------
    // Step 3: 写入审计日志（异步，不阻塞响应）
    // ----------------------------------------------------------
    const log = await this.prisma.irrigationLog.create({
      data: {
        deviceId: targetDevice.id,
        trigger: 'API',
        triggerBy: triggerBy ?? 'AI_Agent',
        command,
        topic,
        status: 'PENDING',
        soilMoisture: undefined,
        temperature: undefined,
        humidity: undefined,
      },
    });

    this.logger.log(
      `[VALVE CONTROL] user=${userId} device=${targetDevice.deviceId} cmd=${command} logId=${log.id}`,
    );

    return {
      success: true,
      deviceId: targetDevice.deviceId,
      command,
      topic,
      logId: log.id,
      message: `Command '${command}' dispatched to device '${targetDevice.deviceId}'`,
    };
  }

  /**
   * 根据 deviceId 查找设备，并验证归属权
   */
  private async resolveDevice(
    userId: string,
    deviceId?: string,
  ) {
    if (deviceId) {
      // 精确查找 + 归属验证
      const device = await this.prisma.device.findFirst({
        where: { deviceId, userId },
      });

      if (!device) {
        // 注意：设备存在但不属于该用户，也抛出 403（不暴露其他人的设备ID）
        throw new ForbiddenException('Device does not belong to your account');
      }

      return device;
    }

    // 未指定 deviceId → 取用户的第一台设备（兜底逻辑）
    const firstDevice = await this.prisma.device.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return firstDevice ?? null;
  }

  /**
   * 查询指定设备的灌溉历史记录
   */
  async getHistory(userId: string, deviceId: string, limit = 20) {
    // 先验证归属
    const device = await this.prisma.device.findFirst({
      where: { deviceId, userId },
    });

    if (!device) {
      throw new ForbiddenException('Device does not belong to your account');
    }

    return this.prisma.irrigationLog.findMany({
      where: { deviceId: device.id },
      orderBy: { issuedAt: 'desc' },
      take: limit,
    });
  }
}
