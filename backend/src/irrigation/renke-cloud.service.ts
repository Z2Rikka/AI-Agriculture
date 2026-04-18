import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MqttClientService } from '../mqtt/mqtt-client.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RenkeCloudService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RenkeCloudService.name);
  private fetchInterval: NodeJS.Timeout;

  // 这是平台的总环境云账号，只需要配一次
  private loginName = process.env.RENKE_LOGIN_NAME || '';
  private password = process.env.RENKE_PASSWORD || '';
  
  private token: string | null = null;
  private tokenExp: number = 0;

  constructor(
    private readonly mqttService: MqttClientService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Renke Cloud Data Fetcher...');
    // Start fetching data every 5 minutes (300000 ms)
    this.fetchData(); // fetch immediately on startup
    this.fetchInterval = setInterval(() => this.fetchData(), 300000);
  }

  onModuleDestroy() {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
    }
  }

  private async getToken(): Promise<string | null> {
    if (!this.loginName || !this.password) {
      this.logger.warn('Renke Cloud credentials not configured in environment variables.');
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (this.token && this.tokenExp > now + 300) {
      return this.token;
    }

    this.logger.log('Fetching new token from Renke Cloud...');
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        const url = `http://www.0531yun.com/api/getToken?loginName=${encodeURIComponent(this.loginName)}&password=${encodeURIComponent(this.password)}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const json = await response.json();

        if (json.code === 1000 && json.data?.token) {
          this.token = json.data.token;
          this.tokenExp = json.data.expiration;
          this.logger.log('Successfully obtained token.');
          return this.token;
        } else {
          this.logger.error(`Failed to get token: ${json.message}`);
        }
      } catch (error: any) {
        this.logger.error(`Error fetching token (attempt ${attempts}): ${error.message}`);
      }
      
      if (attempts < 3) {
        await new Promise(res => setTimeout(res, 2000));
      }
    }
    
    this.logger.error('Failed to obtain Renke Cloud token after 3 attempts.');
    return null;
  }

  private async fetchData() {
    try {
      // 1. 从数据库中找出所有绑定在用户下且类型为 RENKE 的设备
      const renkeDevices = await this.prisma.device.findMany({
        where: { deviceType: 'RENKE' },
      });

      if (renkeDevices.length === 0) {
        this.logger.debug('No Renke devices found in database. Skipping fetch.');
        return;
      }

      // 获取平台 Token
      const token = await this.getToken();
      if (!token) return;

      // 提取所有真实的物理设备地址（假设存放在 deviceId 字段，如果是其他字段请自行替换）
      // 平台 API 支持多个设备一起查，用逗号分隔
      const deviceAddrs = renkeDevices.map(d => d.deviceId).join(',');

      let attempts = 0;
      while (attempts < 3) {
        attempts++;
        try {
          const url = `http://www.0531yun.com/api/data/getRealTimeDataByDeviceAddr?deviceAddrs=${deviceAddrs}`;
          const response = await fetch(url, {
            headers: {
              'authorization': token,
            },
            signal: AbortSignal.timeout(10000)
          });
          const json = await response.json();

          if (json.code === 1000 && json.data && Array.isArray(json.data)) {
            // 返回了多个设备的数据
            for (const deviceData of json.data) {
              await this.processDeviceData(deviceData, renkeDevices);
            }
            return; // Success, exit loop
          } else {
            this.logger.warn(`No data or error from Renke Cloud: ${json.message}`);
          }
        } catch (error: any) {
          this.logger.error(`Error fetching real-time data (attempt ${attempts}): ${error.message}`);
        }
        
        if (attempts < 3) {
          await new Promise(res => setTimeout(res, 2000));
        }
      }
      this.logger.error('Failed to fetch real-time data after 3 attempts. Skipping this cycle.');

    } catch (error: any) {
      // outer catch remains just in case
      this.logger.error(`Unhandled error during fetch cycle: ${error.message}`);
    }
  }

  private async processDeviceData(deviceData: any, dbDevices: any[]) {
    // 根据返回的真实物理地址，找到对应我们数据库里的 Device 表的 ID (UUID)
    // 注意：deviceData.deviceAddr 是个数字或者字符串
    const physicalAddr = String(deviceData.deviceAddr);
    const dbDevice = dbDevices.find(d => d.deviceId === physicalAddr);
    
    if (!dbDevice) {
       this.logger.warn(`Received data for unknown deviceAddr: ${physicalAddr}`);
       return;
    }

    const payload: any = {
      timestamp: deviceData.timeStamp,
      deviceStatus: deviceData.deviceStatus,
    };

    // 解析各个节点下的具体数据
    if (deviceData.dataItem && Array.isArray(deviceData.dataItem)) {
      deviceData.dataItem.forEach((node: any) => {
        if (node.registerItem && Array.isArray(node.registerItem)) {
          node.registerItem.forEach((reg: any) => {
            const name = reg.registerName.trim();
            const value = reg.value;
            
            switch(name) {
              case '空气温度': payload.airTemperature = value; break;
              case '空气湿度': payload.airHumidity = value; break;
              case '土壤温度': payload.soilTemperature = value; break;
              case '土壤湿度': payload.soilHumidity = value; break;
              case '光照度': payload.illuminance = value; break;
              case '电池电量': payload.batteryLevel = value; break;
            }
          });
        }
      });
    }

    this.logger.debug(`Parsed Renke data for device ${physicalAddr}: ${JSON.stringify(payload)}`);

    // 2. 将解析好的数据持久化存入数据库中的 SensorData 表
    try {
      await this.prisma.sensorData.create({
        data: {
          deviceId: dbDevice.id, // 这里填 Prisma Device 表的主键 uuid
          airTemperature: payload.airTemperature,
          airHumidity: payload.airHumidity,
          soilTemperature: payload.soilTemperature,
          soilHumidity: payload.soilHumidity,
          illuminance: payload.illuminance,
          batteryLevel: payload.batteryLevel,
          timestamp: new Date(payload.timestamp || Date.now()),
          // 如果有其他未知数据，可以放在 extraData JSON 里
          extraData: { deviceStatus: payload.deviceStatus }, 
        },
      });
      this.logger.log(`Saved SensorData to DB for device: ${physicalAddr}`);
    } catch (e: any) {
      this.logger.error(`Failed to save SensorData to DB: ${e.message}`);
    }

    // 3. 同时把数据发到 MQTT 管道，让实时监听业务可以立即消费
    const topic = `irrigation/${physicalAddr}/state`;
    this.mqttService.publish(topic, payload);
  }
}
