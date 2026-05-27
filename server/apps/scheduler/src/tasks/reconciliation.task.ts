// apps/scheduler/src/tasks/reconciliation.task.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class ReconciliationTask {
  private readonly logger = new Logger(ReconciliationTask.name);

  constructor(private prisma: PrismaService) {}

  // 每天凌晨5点执行对账
  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async handleDailyReconciliation() {
    this.logger.log('Starting daily reconciliation...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 获取昨日支付总额
    const paymentTotal = await this.prisma.paymentOrder.aggregate({
      where: {
        status: 'paid',
        paidAt: {
          gte: yesterday,
          lt: today,
        },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // 获取昨日退款总额
    const refundTotal = await this.prisma.refundOrder.aggregate({
      where: {
        status: 'success',
        refundedAt: {
          gte: yesterday,
          lt: today,
        },
      },
      _sum: { refundAmount: true },
      _count: { id: true },
    });

    // 获取昨日充值总额
    const rechargeTotal = await this.prisma.rechargeOrder.aggregate({
      where: {
        payStatus: 'paid',
        paidAt: {
          gte: yesterday,
          lt: today,
        },
      },
      _sum: { chargeAmount: true, giftAmount: true },
      _count: { id: true },
    });

    this.logger.log('Daily reconciliation completed', {
      payment: {
        total: paymentTotal._sum.amount,
        count: paymentTotal._count.id,
      },
      refund: {
        total: refundTotal._sum.refundAmount,
        count: refundTotal._count.id,
      },
      recharge: {
        charge: rechargeTotal._sum.chargeAmount,
        gift: rechargeTotal._sum.giftAmount,
        count: rechargeTotal._count.id,
      },
    });

    // 这里可以添加对账差异检测和告警逻辑
  }

  // 每月1号生成结算单
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlySettlement() {
    this.logger.log('Generating monthly settlement orders...');

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // 获取所有租户
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'active' },
    });

    for (const tenant of tenants) {
      // 计算该租户上月的交易数据
      const payments = await this.prisma.paymentOrder.aggregate({
        where: {
          tenantId: tenant.id,
          status: 'paid',
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amount: true },
      });

      const refunds = await this.prisma.refundOrder.aggregate({
        where: {
          tenantId: tenant.id,
          status: 'success',
          refundedAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { refundAmount: true },
      });

      const grossAmount = Number(payments._sum.amount || 0);
      const refundAmount = Number(refunds._sum.refundAmount || 0);
      const commissionAmount = 0; // 根据佣金规则计算
      const payableAmount = grossAmount - refundAmount - commissionAmount;

      // 创建结算单
      await this.prisma.settlementOrder.create({
        data: {
          tenantId: tenant.id,
          settlementNo: `STL${now.getFullYear()}${String(now.getMonth()).padStart(2, '0')}${String(tenant.id).padStart(6, '0')}`,
          periodStart,
          periodEnd,
          grossAmount,
          refundAmount,
          commissionAmount,
          payableAmount,
          status: 'draft',
        },
      });

      this.logger.log(`Settlement order created for tenant: ${tenant.id}`);
    }

    this.logger.log('Monthly settlement generation completed');
  }
}
