// libs/shared/src/security/rate-limit.guard.ts

import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '@app/infra/redis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const userId = request.user?.userId || 'anonymous';
    const path = request.route?.path || request.url;

    const key = `rate_limit:${ip}:${userId}:${path}`;
    const limit = 100; // 每分钟最大请求数
    const window = 60; // 时间窗口（秒）

    const current = await this.redis.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= limit) {
      throw new HttpException('请求过于频繁', HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.redis.set(key, String(count + 1), window);

    return true;
  }
}
