// apps/open-api/src/open-api.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/infra/prisma';
import { RedisModule } from '@app/infra/redis';
import { QueueModule } from '@app/infra/queue';
import { PaymentModule } from '@app/modules/payment';
import { PaymentCallbackController } from './controllers/payment-callback.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    QueueModule,
    PaymentModule,
  ],
  controllers: [PaymentCallbackController],
})
export class OpenApiModule {}
