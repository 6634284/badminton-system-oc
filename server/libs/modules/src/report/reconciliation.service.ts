// libs/modules/src/report/reconciliation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { QueueService } from '@app/infra/queue';
import { RequestContext } from '@app/shared/context';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async generateDailyReconciliation(ctx: RequestContext, date: string) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 获取当日支付总额
    const paymentTotal = await this.prisma.paymentOrder.aggregate({
      where: {
        tenantId: ctx.tenantId,
        status: 'paid',
        paidAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // 获取当日退款总额
    const refundTotal = await this.prisma.refundOrder.aggregate({
      where: {
        tenantId: ctx.tenantId,
        status: 'success',
        refundedAt: { gte: startDate, lte: endDate },
      },
      _sum: { refundAmount: true },
      _count: { id: true },
    });

    // 获取当日充值总额
    const rechargeTotal = await this.prisma.rechargeOrder.aggregate({
      where: {
        tenantId: ctx.tenantId,
        payStatus: 'paid',
        paidAt: { gte: startDate, lte: endDate },
      },
      _sum: { chargeAmount: true, giftAmount: true },
      _count: { id: true },
    });

    // 获取当日活动报名总额
    const activityTotal = await this.prisma.activityRegistration.aggregate({
      where: {
        tenantId: ctx.tenantId,
        status: 'confirmed',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { payAmount: true },
      _count: { id: true },
    });

    return {
      date,
      payment: {
        total: Number(paymentTotal._sum.amount || 0),
        count: paymentTotal._count.id,
      },
      refund: {
        total: Number(refundTotal._sum.refundAmount || 0),
        count: refundTotal._count.id,
      },
      recharge: {
        charge: Number(rechargeTotal._sum.chargeAmount || 0),
        gift: Number(rechargeTotal._sum.giftAmount || 0),
        count: rechargeTotal._count.id,
      },
      activity: {
        total: Number(activityTotal._sum.payAmount || 0),
        count: activityTotal._count.id,
      },
      netAmount: Number(paymentTotal._sum.amount || 0) - Number(refundTotal._sum.refundAmount || 0),
    };
  }

  async generateMonthlySettlement(ctx: RequestContext, year: number, month: number) {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    // 获取月度支付总额
    const paymentTotal = await this.prisma.paymentOrder.aggregate({
      where: {
        tenantId: ctx.tenantId,
        status: 'paid',
        paidAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true },
    });

    // 获取月度退款总额
    const refundTotal = await this.prisma.refundOrder.aggregate({
      where: {
        tenantId: ctx.tenantId,
        status: 'success',
        refundedAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { refundAmount: true },
    });

    // 获取佣金规则
    const commissionRules = await this.prisma.commissionRule.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: 'active',
        effectiveFrom: { lte: periodEnd },
      },
    });

    const grossAmount = Number(paymentTotal._sum.amount || 0);
    const refundAmount = Number(refundTotal._sum.refundAmount || 0);
    const commissionAmount = this.calculateCommission(grossAmount, commissionRules);
    const payableAmount = grossAmount - refundAmount - commissionAmount;

    // 创建结算单
    const settlement = await this.prisma.settlementOrder.create({
      data: {
        tenantId: ctx.tenantId,
        settlementNo: this.generateSettlementNo(year, month),
        periodStart,
        periodEnd,
        grossAmount,
        refundAmount,
        commissionAmount,
        payableAmount,
        status: 'draft',
      },
    });

    return settlement;
  }

  async detectAnomalies(ctx: RequestContext, date: string) {
    const anomalies: Array<{ type: string; message: string; severity: string }> = [];

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 检查支付与退款比例
    const paymentTotal = await this.prisma.paymentOrder.aggregate({
      where: {
        tenantId: ctx.tenantId,
        status: 'paid',
        paidAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const refundTotal = await this.prisma.refundOrder.aggregate({
      where: {
        tenantId: ctx.tenantId,
        status: 'success',
        refundedAt: { gte: startDate, lte: endDate },
      },
      _sum: { refundAmount: true },
    });

    const paymentAmount = Number(paymentTotal._sum.amount || 0);
    const refundAmount = Number(refundTotal._sum.refundAmount || 0);

    if (paymentAmount > 0 && refundAmount / paymentAmount > 0.3) {
      anomalies.push({
        type: 'high_refund_rate',
        message: `退款率异常: ${(refundAmount / paymentAmount * 100).toFixed(1)}%`,
        severity: 'high',
      });
    }

    // 检查钱包余额异常
    const walletsWithNegativeBalance = await this.prisma.wallet.count({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { cashBalance: { lt: 0 } },
          { giftBalance: { lt: 0 } },
        ],
      },
    });

    if (walletsWithNegativeBalance > 0) {
      anomalies.push({
        type: 'negative_balance',
        message: `${walletsWithNegativeBalance}个钱包余额为负`,
        severity: 'critical',
      });
    }

    // 检查重复支付
    const duplicatePayments = await this.prisma.paymentOrder.groupBy({
      by: ['outTradeNo'],
      where: {
        tenantId: ctx.tenantId,
        status: 'paid',
        paidAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
      having: {
        id: { _count: { gt: 1 } },
      },
    });

    if (duplicatePayments.length > 0) {
      anomalies.push({
        type: 'duplicate_payment',
        message: `${duplicatePayments.length}笔重复支付`,
        severity: 'critical',
      });
    }

    return {
      date,
      anomalies,
      hasAnomalies: anomalies.length > 0,
    };
  }

  private calculateCommission(amount: number, rules: any[]): number {
    let commission = 0;

    for (const rule of rules) {
      if (rule.ruleType === 'percent') {
        commission += amount * Number(rule.ruleValue) / 100;
      } else if (rule.ruleType === 'fixed') {
        commission += Number(rule.ruleValue);
      }
    }

    return commission;
  }

  private generateSettlementNo(year: number, month: number): string {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `STL${year}${String(month).padStart(2, '0')}${random}`;
  }
}
