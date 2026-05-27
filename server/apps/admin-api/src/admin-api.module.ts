// apps/admin-api/src/admin-api.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '@app/infra/prisma';
import { RedisModule } from '@app/infra/redis';
import { QueueModule } from '@app/infra/queue';
import { AuthModule } from '@app/modules/auth';
import { TenantModule } from '@app/modules/tenant';
import { MemberModule } from '@app/modules/member';
import { VenueModule } from '@app/modules/venue';
import { ActivityModule } from '@app/modules/activity';
import { WalletModule } from '@app/modules/wallet';
import { PaymentModule } from '@app/modules/payment';
import { MallModule } from '@app/modules/mall';
import { CouponModule } from '@app/modules/coupon';
import { NotificationModule } from '@app/modules/notification';
import { ReportModule } from '@app/modules/report';
import { AuditModule } from '@app/shared/audit';
import { AppExceptionFilter, TraceInterceptor, ResponseTransformInterceptor } from '@app/shared';
import { AuthController } from './controllers/auth.controller';
import { PlatformController } from './controllers/platform.controller';
import { ClubController } from './controllers/club.controller';
import { StaffController } from './controllers/staff.controller';
import { VenueController } from './controllers/venue.controller';
import { ActivityController } from './controllers/activity.controller';
import { MemberController } from './controllers/member.controller';
import { WalletController } from './controllers/wallet.controller';
import { MallController } from './controllers/mall.controller';
import { CouponController } from './controllers/coupon.controller';
import { ReportController } from './controllers/report.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    QueueModule,
    AuthModule,
    TenantModule,
    MemberModule,
    VenueModule,
    ActivityModule,
    WalletModule,
    PaymentModule,
    MallModule,
    CouponModule,
    NotificationModule,
    ReportModule,
    AuditModule,
  ],
  controllers: [
    AuthController,
    PlatformController,
    ClubController,
    StaffController,
    VenueController,
    ActivityController,
    MemberController,
    WalletController,
    MallController,
    CouponController,
    ReportController,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AppExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
  ],
})
export class AdminApiModule {}
