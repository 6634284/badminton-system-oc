// libs/shared/src/security/security.module.ts

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { SecurityMiddleware } from './security.middleware';

@Module({
  providers: [RateLimitGuard],
  exports: [RateLimitGuard],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*');
  }
}
