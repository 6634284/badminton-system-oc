// libs/shared/src/cache/cache.module.ts

import { Module } from '@nestjs/common';
import { CacheInterceptor } from './cache.interceptor';

@Module({
  providers: [CacheInterceptor],
  exports: [CacheInterceptor],
})
export class CacheModule {}
