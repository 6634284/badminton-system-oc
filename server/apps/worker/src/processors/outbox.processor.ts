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
        return this.handleActivityRegistered(payload);
      case 'activity.canceled':
        return this.handleActivityCanceled(payload);
      case 'payment.completed':
        return this.handlePaymentCompleted(payload);
      case 'payment.refunded':
        return this.handlePaymentRefunded(payload);
      case 'member.joined':
        return this.handleMemberJoined(payload);
      case 'order.created':
        return this.handleOrderCreated(payload);
      default:
        this.logger.warn(`Unknown event type: ${event.eventType}`);
    }
  }

  private async handleActivityRegistered(payload: any) {
    this.logger.log(`[Event] Activity registered: ${payload.activityId}`);

    await this.queueService.addJob('notification', 'send-wechat', {
      userId: payload.userId,
      templateId: 'activity_registered',
      data: {
        activity_title: payload.activityTitle,
        activity_time: payload.activityTime,
        venue_name: payload.venueName,
      },
    });
  }

  private async handleActivityCanceled(payload: any) {
    this.logger.log(`[Event] Activity canceled: ${payload.activityId}`);

    const registrations = await this.prisma.activityRegistration.findMany({
      where: {
        activityId: payload.activityId,
        status: 'canceled',
      },
    });

    for (const reg of registrations) {
      await this.queueService.addJob('notification', 'send-wechat', {
        userId: Number(reg.userId),
        templateId: 'activity_canceled',
        data: {
          activity_title: payload.activityTitle,
          reason: payload.reason,
        },
      });
    }
  }

  private async handlePaymentCompleted(payload: any) {
    this.logger.log(`[Event] Payment completed: ${payload.paymentId}`);

    if (payload.bizType === 'recharge') {
      await this.queueService.addJob('notification', 'send-wechat', {
        userId: payload.userId,
        templateId: 'recharge_success',
        data: {
          amount: String(payload.amount),
          balance: String(payload.balance),
        },
      });
    }
  }

  private async handlePaymentRefunded(payload: any) {
    this.logger.log(`[Event] Payment refunded: ${payload.refundId}`);

    await this.queueService.addJob('notification', 'send-wechat', {
      userId: payload.userId,
      templateId: 'refund_success',
      data: {
        amount: String(payload.amount),
      },
    });
  }

  private async handleMemberJoined(payload: any) {
    this.logger.log(`[Event] Member joined: ${payload.userId}`);

    await this.queueService.addJob('notification', 'send-wechat', {
      userId: payload.userId,
      templateId: 'welcome',
      data: {
        tenant_name: payload.tenantName,
      },
    });
  }

  private async handleOrderCreated(payload: any) {
    this.logger.log(`[Event] Order created: ${payload.orderNo}`);

    await this.queueService.addJob('notification', 'send-wechat', {
      userId: payload.userId,
      templateId: 'order_created',
      data: {
        order_no: payload.orderNo,
        amount: String(payload.amount),
      },
    });
  }
}
