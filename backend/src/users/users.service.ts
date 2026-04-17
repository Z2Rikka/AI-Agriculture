// users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建用户并生成唯一的 API_KEY
   * API_KEY = 32 字节十六进制（128 bit entropy）
   */
  async create(username: string): Promise<{ user: any; apiKey: string }> {
    const apiKey = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        username,
        password: '(API_KEY_ONLY)',  // 占位：API Key 场景下不使用密码
        apiKey,
        apiKeyAlias: 'default',
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        apiKey: true,
        apiKeyAlias: true,
        isActive: true,
        createdAt: true,
      },
    });

    return { user, apiKey };
  }

  findByApiKey(apiKey: string) {
    return this.prisma.user.findUnique({
      where: { apiKey },
      select: {
        id: true,
        username: true,
        apiKey: true,
        isActive: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        apiKeyAlias: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        _count: { select: { devices: true } },
      },
    });
  }
}
