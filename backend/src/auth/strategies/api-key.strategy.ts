// auth/strategies/api-key.strategy.ts
// 自定义 API Key 鉴权策略：
// 1. 从 Authorization: Bearer <token> 提取 API_KEY
// 2. 通过 Prisma 查询验证 Key 合法性
// 3. 将用户上下文挂载到 request.user
// 注意：不使用 passport-custom，而是直接在 Guard 中处理，保持简单

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, Injectable as NestInjectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IRequestUser } from '../../common/interfaces/request-user.interface';

export class ApiKeyAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) {
      throw new UnauthorizedException('Empty API Key');
    }

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

    // 挂载用户上下文（类似 Passport 策略行为）
    (request as any).user = {
      userId: user.id,
      username: user.username,
      apiKey: user.apiKey,
    };

    // 异步更新最后使用时间，不阻塞响应
    this.prisma.user.update({
      where: { id: user.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {/* fire-and-forget */});

    return true;
  }
}
