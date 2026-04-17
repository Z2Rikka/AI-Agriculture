// irrigation/irrigation.controller.ts
// OpenClaw / AI Agent 的 HTTP 控制接口
// 提供 RESTful 控制和状态查询端点

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IrrigationService } from './irrigation.service';
import { ValveControlDto, ValveControlResponseDto } from './dto/valve-control.dto';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { IRequestUser } from '../common/interfaces/request-user.interface';

@ApiTags('Irrigation')
@Controller('api/v1/irrigation')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('API_KEY')
export class IrrigationController {
  constructor(private readonly irrigationService: IrrigationService) {}

  // ============================================================
  // 阀门控制（AI Agent 触发）
  // POST /api/v1/irrigation/control
  // ============================================================
  @Post('control')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '控制灌溉阀门（OpenClaw 触发入口）',
    description: `
      AI Agent 通过此接口控制灌溉阀门。
      必须在请求头中携带 Authorization: Bearer <API_KEY>。

      设备归属验证：系统会自动检查该 API_KEY 对应的用户是否拥有目标设备。
      鉴权失败 → 403 Forbidden
      设备不存在 → 404 Not Found
      设备不归属该用户 → 403 Forbidden
    `,
  })
  @ApiResponse({ status: 200, description: '指令下发成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 401, description: 'API Key 无效或缺失' })
  @ApiResponse({ status: 403, description: '设备不归属当前用户' })
  @ApiResponse({ status: 404, description: '设备未找到' })
  async controlValve(
    @CurrentUser() user: IRequestUser,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: ValveControlDto,
  ): Promise<ValveControlResponseDto> {
    if (!dto.command) {
      throw new BadRequestException('command is required (ON or OFF)');
    }

    return this.irrigationService.controlValve(user.userId, dto);
  }

  // ============================================================
  // 批量控制（可选：支持同时控制多台设备）
  // POST /api/v1/irrigation/batch-control
  // ============================================================
  @Post('batch-control')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量控制灌溉阀门' })
  async batchControl(
    @CurrentUser() user: IRequestUser,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dtos: ValveControlDto[],
  ): Promise<ValveControlResponseDto[]> {
    const results = await Promise.all(
      dtos.map((dto) => this.irrigationService.controlValve(user.userId, dto)),
    );
    return results;
  }

  // ============================================================
  // 查询灌溉历史
  // GET /api/v1/irrigation/history?deviceId=ESP32_001&limit=20
  // ============================================================
  @Get('history')
  @ApiOperation({ summary: '查询指定设备的灌溉历史' })
  async getHistory(
    @CurrentUser() user: IRequestUser,
    @Query('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    if (!deviceId) {
      throw new BadRequestException('deviceId query parameter is required');
    }

    return this.irrigationService.getHistory(
      user.userId,
      deviceId,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
