// devices/devices.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { IRequestUser } from '../common/interfaces/request-user.interface';

@ApiTags('Devices')
@Controller('devices')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('API_KEY')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /** 创建设备（绑定到当前用户） */
  @Post()
  create(
    @CurrentUser() user: IRequestUser,
    @Body() dto: CreateDeviceDto,
  ) {
    return this.devicesService.create(user.userId, dto);
  }

  /** 查询当前用户的所有设备 */
  @Get()
  findAll(@CurrentUser() user: IRequestUser) {
    return this.devicesService.findAllByUser(user.userId);
  }

  /** 查询指定设备详情 */
  @Get(':deviceId')
  findOne(
    @CurrentUser() user: IRequestUser,
    @Param('deviceId') deviceId: string,
  ) {
    return this.devicesService.findOne(user.userId, deviceId);
  }
}
