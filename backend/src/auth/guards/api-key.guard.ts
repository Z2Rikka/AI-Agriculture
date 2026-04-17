// auth/guards/api-key.guard.ts
// 自定义 API Key 鉴权 Guard：
// 1. 从 Authorization: Bearer <token> 提取 API_KEY
// 2. 通过 Prisma 查询验证 Key 合法性（isActive=true）
// 3. 将用户上下文挂载到 request.user，供 @CurrentUser() 使用
// 不依赖 passport-jwt，保持轻量

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IRequestUser } from '../../common/interfaces/request-user.interface';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<Request>();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header. Expected: Bearer <API_KEY>',
      );
    }

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) {
      throw new UnauthorizedException('Empty API Key');
    }

    // 数据库验证
    const user = await this.prisma.user.findUnique({
      where: { apiKey, isActive: true },
      select: {
        id: true,
        username: true,
        apiKey: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or disabled API Key');
    }

    // 将用户上下文挂载到 request（模拟 Passport 策略行为）
    const requestUser: IRequestUser = {
      userId: user.id,
      username: user.username,
      apiKey: user.apiKey,
    };
    (request as any).user = requestUser;

    // 异步更新最后使用时间，不阻塞响应
    this.prisma.user
      .update({
        where: { id: user.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {/* fire-and-forget */});

    return true;
  }
}
