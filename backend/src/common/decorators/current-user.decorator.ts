// common/decorators/current-user.decorator.ts
// 从请求对象中提取当前认证用户

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestUser } from '../interfaces/request-user.interface';

/**
 * 用法示例：
 *   @Post()
 *   control(@CurrentUser() user: IRequestUser) { ... }
 *
 *   // 带默认值（用户未绑定设备时返回 null）
 *   @Get('my-device')
 *   getDevice(@CurrentUser() user: IRequestUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof IRequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IRequestUser;

    if (!user) return null;

    // 如果传入了具体字段名，只返回该字段
    return data ? user[data] : user;
  },
);
