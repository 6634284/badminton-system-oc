// apps/scheduler/src/scheduler.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@app/infra/prisma';
import { RedisModule } from '@app/infra/redis';
import { QueueModule } from '@app/infra/queue';
import { ActivityStatusTask } from './tasks/activity-status.task';
import { ReconciliationTask } from './tasks/reconciliation.task';
import { CleanupTask } from './tasks/cleanup.task';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    QueueModule,
  ],
  providers: [
    ActivityStatusTask,
    ReconciliationTask,
    CleanupTask,
  ],
})
export class SchedulerModule {}
