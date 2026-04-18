// mqtt/mqtt-client.service.ts
// MQTT 客户端服务：连接 Broker、发布指令、订阅设备状态
// 使用 mqtt.js 库实现，通过 NestJS 生命周期管理连接

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, share } from 'rxjs/operators';
import * as mqtt from 'mqtt';

export interface MqttMessage {
  topic: string;
  payload: string;
  deviceId?: string;
}

@Injectable()
export class MqttClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttClientService.name);
  private client: mqtt.MqttClient | null = null;

  /** 内部广播 Subject，所有设备状态共享一股流 */
  private stateSubject = new Subject<{ topic: string; payload: Record<string, unknown> }>();

  /** MQTT Broker 配置 */
  private readonly brokerUrl  = process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883';
  private readonly clientId    = `nestjs_${Math.random().toString(16).slice(2, 10)}`;
  private readonly username    = process.env.MQTT_USERNAME;
  private readonly password    = process.env.MQTT_PASSWORD;

  // ============================================================
  // 生命周期
  // ============================================================

  async onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    this.logger.log('MQTT client disconnecting...');
    this.client?.end(true);
    this.stateSubject.complete();
  }

  // ============================================================
  // 内部：建立 MQTT 连接
  // ============================================================

  private connect() {
    this.client = mqtt.connect(this.brokerUrl, {
      clientId: this.clientId,
      username: this.username || undefined,
      password: this.password || undefined,
      keepalive: 60,
      reconnectPeriod: 5_000,    // 断线每 5 秒重连
      connectTimeout: 10_000,
    });

    this.client.on('connect', () => {
      this.logger.log(`[MQTT] Connected to ${this.brokerUrl}`);
      this.subscribeStateTopic();
    });

    this.client.on('reconnect', () => {
      this.logger.warn('[MQTT] Reconnecting...');
    });

    this.client.on('offline', () => {
      this.logger.warn('[MQTT] Client offline');
    });

    this.client.on('error', (err) => {
      this.logger.error('[MQTT] Error', err?.message);
    });

    this.client.on('message', (topic, buff) => {
      try {
        const payload = JSON.parse(buff.toString());
        this.stateSubject.next({ topic, payload });
      } catch {
        this.logger.debug(`[MQTT] Non-JSON message on ${topic}: ${buff.toString()}`);
      }
    });
  }

  // ============================================================
  // 内部：订阅状态主题（仅执行一次）
  // ============================================================

  private subscribeStateTopic() {
    const topic = 'irrigation/+/state';   // + 是单层通配符
    this.client?.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        this.logger.error(`[MQTT] Failed to subscribe ${topic}`, err?.message);
      } else {
        this.logger.log(`[MQTT] Subscribed to ${topic}`);
      }
    });
  }

  // ============================================================
  // 公开 API：发布灌溉指令
  // ============================================================

  /**
   * 发布任意数据到指定主题
   */
  publish(topic: string, payloadObj: Record<string, unknown>): void {
    const payload = JSON.stringify(payloadObj);
    this.client?.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        this.logger.error(`[MQTT] Publish failed to ${topic}`, err?.message);
      } else {
        this.logger.debug(`[MQTT OUT] topic=${topic} payload=${payload}`);
      }
    });
  }

  /**
   * 向指定设备下发 ON / OFF 指令
   * 主题格式: irrigation/{deviceId}/command
   */
  publishCommand(
    deviceId: string,
    command: 'ON' | 'OFF',
    issuedBy?: string,
  ): void {
    const topic = `irrigation/${deviceId}/command`;
    const payload = JSON.stringify({
      command,
      issuedBy: issuedBy ?? 'system',
      timestamp: new Date().toISOString(),
    });

    this.client?.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        this.logger.error(`[MQTT] Publish failed to ${topic}`, err?.message);
      } else {
        this.logger.log(`[MQTT OUT] topic=${topic} cmd=${command} by=${issuedBy ?? 'system'}`);
      }
    });
  }

  // ============================================================
  // 公开 API：获取设备状态 Observable
  // ============================================================

  /**
   * 返回共享的 Observable，供 DevicesService 等注入使用。
   * 订阅者共享同一个底层 MQTT 连接。
   */
  getStateUpdates(): Observable<{ topic: string; payload: Record<string, unknown> }> {
    return this.stateSubject.asObservable().pipe(
      filter(({ topic }) => topic.startsWith('irrigation/') && topic.endsWith('/state')),
      share(),
    );
  }
}
