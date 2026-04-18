// irrigation/dto/valve-control.dto.ts
// 阀门控制请求的 DTO（OpenClaw HTTP POST /api/v1/irrigation/control）

import { IsString, IsIn, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValveControlDto {
  /** 目标设备编号（不传则使用用户绑定的第一台设备） */
  @IsOptional()
  @IsString()
  deviceId?: string;

  /** 控制指令：ON 开水阀，OFF 关水阀 */
  @IsString()
  @IsIn(['ON', 'OFF'])
  command: 'ON' | 'OFF';

  /** 扩展字段：目标浇水量（毫升），设备端可据此计算阀门开启时长 */
  @IsOptional()
  @IsNumber()
  waterVolumeMl?: number;

  /** 扩展字段：本次灌溉时长（秒），与 waterVolumeMl 二选一或组合使用 */
  @IsOptional()
  @IsNumber()
  durationSec?: number;

  /** 触发来源标识（可选，供 AI Agent 传入自身 ID） */
  @IsOptional()
  @IsString()
  triggerBy?: string;
}

export class ValveControlResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  deviceId: string;

  @ApiProperty()
  command: string;

  @ApiProperty()
  topic: string;

  @ApiProperty()
  logId: string;

  @ApiProperty()
  message: string;
}
