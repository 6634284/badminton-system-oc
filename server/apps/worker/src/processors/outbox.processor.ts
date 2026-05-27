// apps/worker/src/processors/outbox.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@app/infra/prisma';
import { QueueService } from '@app/infra/queue';

@Processor('outbox')
export class OutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Processing outbox job: ${job.name}`);

    switch (job.name) {
      case 'process-pending':
        return this.handleProcessPending();
      case 'retry-failed':
        return this.handleRetryFailed();
      default:
        this.logger.warn(`Unknown outbox job: ${job.name}`);
    }
  }

  private async handleProcessPending() {
    this.logger.log('Processing pending outbox events');

    const pendingEvents = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'pending',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    for (const event of pendingEvents) {
      try {
        // 根据事件类型分发处理
        await this.processEvent(event);

        // 更新状态
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'sent' },
        });

        this.logger.log(`Outbox event processed: ${event.id}`);
      } catch (error) {
        this.logger.error(`Outbox event failed: ${event.id}`, error);

        // 更新重试次数和下次重试时间
        const retryCount = event.retryCount + 1;
        const nextRetryAt = new Date(Date.now() + Math.pow(2, retryCount) * 1000);

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: retryCount >= 5 ? 'failed' : 'pending',
            retryCount,
            nextRetryAt,
          },
        });
      }
    }
  }

  private async handleRetryFailed() {
    this.logger.log('Retrying failed outbox events');

    const failedEvents = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'pending',
        retryCount: { lt: 5 },
        nextRetryAt: { lte: new Date() },
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    for (const event of failedEvents) {
      try {
        await this.processEvent(event);

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'sent' },
        });

        this.logger.log(`Outbox event retried: ${event.id}`);
      } catch (error) {
        this.logger.error(`Outbox event retry failed: ${event.id}`, error);

        const retryCount = event.retryCount + 1;
        const nextRetryAt = new Date(Date.now() + Math.pow(2, retryCount) * 1000);

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: retryCount >= 5 ? 'failed' : 'pending',
            retryCount,
            nextRetryAt,
          },
        });
      }
    }
  }

  private async processEvent(event: any) {
    const payload = event.payloadJson as any;

    switch (event.eventType) {
      case 'activity.registered':
        // 处理活动报名事件
        this.logger.log(`Processing activity.registered event: ${event.id}`);
        break;
      case 'activity.canceled':
        // 处理活动取消事件
        this.logger.log(`Processing activity.canceled event: ${event.id}`);
        break;
      case 'payment.completed':
        // 处理支付完成事件
        this.logger.log(`Processing payment.completed event: ${event.id}`);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event.eventType}`);
    }
  }
}
