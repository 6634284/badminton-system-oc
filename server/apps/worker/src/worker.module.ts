// apps/worker/src/worker.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/infra/prisma';
import { RedisModule } from '@app/infra/redis';
import { QueueModule } from '@app/infra/queue';
import { PaymentModule } from '@app/modules/payment';
import { WalletModule } from '@app/modules/wallet';
import { NotificationModule } from '@app/modules/notification';
import { RefundProcessor } from './processors/refund.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { OutboxProcessor } from './processors/outbox.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    QueueModule,
    PaymentModule,
    WalletModule,
    NotificationModule,
  ],
  providers: [
    RefundProcessor,
    NotificationProcessor,
    OutboxProcessor,
  ],
})
export class WorkerModule {}
