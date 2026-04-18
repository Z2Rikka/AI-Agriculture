import { ApiProperty } from '@nestjs/swagger';

export class DeviceSensorDataDto {
  @ApiProperty({ description: 'The physical ID of the device' })
  deviceId: string;

  @ApiProperty({ description: 'The name or alias of the device' })
  deviceName: string;

  @ApiProperty({ description: 'The type of device', example: 'RENKE' })
  deviceType: string;

  @ApiProperty({ description: 'Air temperature in Celsius', nullable: true })
  airTemperature: number | null;

  @ApiProperty({ description: 'Air humidity percentage', nullable: true })
  airHumidity: number | null;

  @ApiProperty({ description: 'Soil temperature in Celsius', nullable: true })
  soilTemperature: number | null;

  @ApiProperty({ description: 'Soil humidity percentage', nullable: true })
  soilHumidity: number | null;

  @ApiProperty({ description: 'Illuminance in Lux', nullable: true })
  illuminance: number | null;

  @ApiProperty({ description: 'Battery level percentage', nullable: true })
  batteryLevel: number | null;

  @ApiProperty({ description: 'Timestamp of the sensor reading', nullable: true })
  timestamp: Date | null;
}

export class GetLatestSensorsResponseDto {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({ type: [DeviceSensorDataDto], description: 'Latest sensor data for each device bound to the user' })
  data: DeviceSensorDataDto[];
}
