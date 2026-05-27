// apps/scheduler/src/tasks/cleanup.task.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class CleanupTask {
  private readonly logger = new Logger(CleanupTask.name);

  constructor(private prisma: PrismaService) {}

  // 每天凌晨3点清理过期数据
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    this.logger.log('Starting cleanup task...');

    const now = new Date();

    // 清理过期的幂等键（60秒前的）
    // 这里简化处理，实际需要根据业务逻辑调整

    // 清理过期的支付单（超过24小时未支付）
    const expiredPayments = await this.prisma.paymentOrder.updateMany({
      where: {
        status: 'created',
        createdAt: {
          lt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      },
      data: {
        status: 'expired',
      },
    });

    this.logger.log(`Expired ${expiredPayments.count} payment orders`);

    // 清理过期的优惠券
    const expiredCoupons = await this.prisma.userCoupon.updateMany({
      where: {
        status: 'unused',
        validTo: {
          lt: now,
        },
      },
      data: {
        status: 'expired',
      },
    });

    this.logger.log(`Expired ${expiredCoupons.count} user coupons`);

    // 清理过期的outbox事件（超过7天的已发送事件）
    const deletedOutbox = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: 'sent',
        createdAt: {
          lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    this.logger.log(`Deleted ${deletedOutbox.count} old outbox events`);

    this.logger.log('Cleanup task completed');
  }

  // 每小时检查订单超时
  @Cron(CronExpression.EVERY_HOUR)
  async handleOrderTimeout() {
    this.logger.log('Checking order timeouts...');

    const now = new Date();

    // 关闭超过30分钟未支付的商城订单
    const timeoutOrders = await this.prisma.mallOrder.updateMany({
      where: {
        status: 'pending_pay',
        createdAt: {
          lt: new Date(now.getTime() - 30 * 60 * 1000),
        },
      },
      data: {
        status: 'canceled',
      },
    });

    this.logger.log(`Canceled ${timeoutOrders.count} timeout orders`);

    // 释放锁定的库存
    // 这里需要根据取消的订单释放库存，简化处理
  }
}
