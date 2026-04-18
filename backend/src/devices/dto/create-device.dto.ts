// devices/dto/create-device.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeviceDto {
  @ApiProperty({ example: 'ESP32_001', description: '物理设备编号（必须唯一）' })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({ example: '1号大棚主阀', description: '设备友好名称' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ example: 'ESP32', description: '设备类型' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: '设备端认证密钥（OTA 时使用）' })
  @IsOptional()
  @IsString()
  deviceSecret?: string;
}
