import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SensorsService } from './sensors.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { IRequestUser } from '../common/interfaces/request-user.interface';
import { GetLatestSensorsResponseDto } from './dto/sensor-data-response.dto';

@ApiTags('Sensors / OpenClaw API')
@Controller('sensors')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('API_KEY')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get('latest')
  @ApiOperation({
    summary: 'Retrieve latest sensor data',
    description: 'Fetches the most recent sensor reading for all devices bound to the user authorized by the API Key. Designed to be consumed by AI agents like OpenClaw.'
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved the latest sensor data.',
    type: GetLatestSensorsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid API Key.' })
  async getLatestSensors(@CurrentUser() user: IRequestUser): Promise<GetLatestSensorsResponseDto> {
    const data = await this.sensorsService.getLatestSensorDataForUser(user.userId);
    return {
      success: true,
      data,
    };
  }
}
