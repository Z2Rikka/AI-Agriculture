// users/users.controller.ts
import { Controller, Get, Post, Body, UseGuards, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { IRequestUser } from '../common/interfaces/request-user.interface';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** 注册新用户（生成 API_KEY，调试/管理接口，生产环境应加管理员鉴权） */
  @Post()
  @ApiHeader({ name: 'x-admin-secret', description: 'Admin Registration Secret', required: true })
  create(
    @Body() dto: CreateUserDto,
    @Headers('x-admin-secret') adminSecret: string,
  ) {
    const expectedSecret = process.env.ADMIN_REGISTRATION_SECRET;
    if (!expectedSecret || adminSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid or missing admin secret');
    }
    return this.usersService.create(dto.username);
  }

  /** 查询所有用户（管理员接口） */
  @Get()
  @UseGuards(ApiKeyGuard)
  @ApiBearerAuth('API_KEY')
  findAll() {
    return this.usersService.findAll();
  }

  /** 查询当前登录用户的信息 */
  @Get('me')
  @UseGuards(ApiKeyGuard)
  @ApiBearerAuth('API_KEY')
  getMe(@CurrentUser() user: IRequestUser) {
    return this.usersService.findByApiKey(user.apiKey);
  }
}
