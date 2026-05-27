// libs/shared/src/cache/cache.interceptor.ts

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '@app/infra/redis';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from './cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private redis: RedisService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
    const cacheTTL = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) || 60;

    if (!cacheKey) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const fullCacheKey = this.buildCacheKey(cacheKey, request);

    // 尝试从缓存获取
    const cached = await this.redis.get(fullCacheKey);
    if (cached) {
      return of(JSON.parse(cached));
    }

    // 执行请求并缓存结果
    return next.handle().pipe(
      tap(async (response) => {
        if (response && response.code === 0) {
          await this.redis.set(fullCacheKey, JSON.stringify(response), cacheTTL);
        }
      }),
    );
  }

  private buildCacheKey(key: string, request: any): string {
    const userId = request.user?.userId || 'anonymous';
    const tenantId = request.ctx?.tenantId || '0';
    const queryString = JSON.stringify(request.query || {});
    return `cache:${tenantId}:${userId}:${key}:${queryString}`;
  }
}
