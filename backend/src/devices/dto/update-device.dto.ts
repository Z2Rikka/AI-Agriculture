// devices/dto/update-device.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: '2号大棚主阀', description: '设备友好名称' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ example: 'ESP32', description: '设备类型' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}
