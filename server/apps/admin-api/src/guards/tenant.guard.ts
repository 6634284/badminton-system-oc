// apps/admin-api/src/guards/tenant.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未登录');
    }

    // 后台从 JWT 中获取 tenantId
    const tenantId = user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('缺少租户ID');
    }

    // 验证用户是否属于该租户
    const staff = await this.prisma.tenantStaff.findFirst({
      where: {
        userId: user.userId,
        tenantId: Number(tenantId),
        status: 'active',
      },
    });

    if (!staff) {
      throw new ForbiddenException('不属于该俱乐部');
    }

    // 将租户信息注入到请求上下文
    request.ctx = {
      ...user,
      tenantId: Number(tenantId),
      now: new Date(),
      locale: request.headers['accept-language'] || 'zh-CN',
    };

    return true;
  }
}
