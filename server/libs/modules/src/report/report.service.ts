// libs/modules/src/report/report.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(ctx: RequestContext, range: string = 'today') {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // 今日交易额
    const todayGmv = await this.prisma.paymentOrder.aggregate({
      where: {
        tenantId: ctx.tenantId,
        status: 'paid',
        paidAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // 今日订单数
    const todayOrders = await this.prisma.paymentOrder.count({
      where: {
        tenantId: ctx.tenantId,
        status: 'paid',
        paidAt: { gte: startDate, lte: endDate },
      },
    });

    // 今日活跃会员
    const todayActiveMembers = await this.prisma.activityRegistration.findMany({
      where: {
        tenantId: ctx.tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    // 今日新增会员
    const todayNewMembers = await this.prisma.member.count({
      where: {
        tenantId: ctx.tenantId,
        joinedAt: { gte: startDate, lte: endDate },
      },
    });

    // 今日活动数
    const todayActivities = await this.prisma.activity.count({
      where: {
        tenantId: ctx.tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // 钱包余额总额
    const walletBalanceTotal = await this.prisma.wallet.aggregate({
      where: {
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
      _sum: { cashBalance: true, giftBalance: true },
    });

    return {
      todayGmv: todayGmv._sum.amount || 0,
      todayOrders,
      todayActiveMembers: todayActiveMembers.length,
      todayNewMembers,
      todayActivities,
      walletBalanceTotal: Number(walletBalanceTotal._sum.cashBalance || 0) + Number(walletBalanceTotal._sum.giftBalance || 0),
    };
  }

  async getSalesReport(ctx: RequestContext, params: {
    startDate: string;
    endDate: string;
    groupBy?: string;
  }) {
    const { startDate, endDate, groupBy = 'day' } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 按时间分组统计
    const payments = await this.prisma.paymentOrder.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: 'paid',
        paidAt: { gte: start, lte: end },
      },
      select: {
        amount: true,
        paidAt: true,
        bizType: true,
      },
    });

    // 按日期分组
    const dailyData: Record<string, { amount: number; count: number }> = {};
    for (const payment of payments) {
      const date = payment.paidAt?.toISOString().slice(0, 10) || '';
      if (!dailyData[date]) {
        dailyData[date] = { amount: 0, count: 0 };
      }
      dailyData[date].amount += Number(payment.amount);
      dailyData[date].count += 1;
    }

    // 按业务类型分组
    const bizTypeData: Record<string, { amount: number; count: number }> = {};
    for (const payment of payments) {
      const bizType = payment.bizType;
      if (!bizTypeData[bizType]) {
        bizTypeData[bizType] = { amount: 0, count: 0 };
      }
      bizTypeData[bizType].amount += Number(payment.amount);
      bizTypeData[bizType].count += 1;
    }

    return {
      daily: Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data,
      })),
      byBizType: Object.entries(bizTypeData).map(([bizType, data]) => ({
        bizType,
        ...data,
      })),
      total: {
        amount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
        count: payments.length,
      },
    };
  }

  async getMemberReport(ctx: RequestContext, params: {
    startDate: string;
    endDate: string;
  }) {
    const { startDate, endDate } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 新增会员
    const newMembers = await this.prisma.member.count({
      where: {
        tenantId: ctx.tenantId,
        joinedAt: { gte: start, lte: end },
      },
    });

    // 会员等级分布
    const levelDistribution = await this.prisma.member.groupBy({
      by: ['level'],
      where: {
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
      _count: { id: true },
    });

    // 活跃会员（有报名记录）
    const activeMembers = await this.prisma.activityRegistration.findMany({
      where: {
        tenantId: ctx.tenantId,
        createdAt: { gte: start, lte: end },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return {
      newMembers,
      activeMembers: activeMembers.length,
      levelDistribution: levelDistribution.map((item) => ({
        level: item.level,
        count: item._count.id,
      })),
    };
  }

  async getActivityReport(ctx: RequestContext, params: {
    startDate: string;
    endDate: string;
  }) {
    const { startDate, endDate } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 活动统计
    const activities = await this.prisma.activity.findMany({
      where: {
        tenantId: ctx.tenantId,
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        type: true,
        capacity: true,
        joinCount: true,
        price: true,
      },
    });

    // 按类型统计
    const typeStats: Record<string, { count: number; totalParticipants: number; totalRevenue: number }> = {};
    for (const activity of activities) {
      if (!typeStats[activity.type]) {
        typeStats[activity.type] = { count: 0, totalParticipants: 0, totalRevenue: 0 };
      }
      typeStats[activity.type].count += 1;
      typeStats[activity.type].totalParticipants += activity.joinCount;
      typeStats[activity.type].totalRevenue += Number(activity.price) * activity.joinCount;
    }

    return {
      totalActivities: activities.length,
      byType: Object.entries(typeStats).map(([type, data]) => ({
        type,
        ...data,
      })),
    };
  }

  async exportReport(ctx: RequestContext, type: string, params: any) {
    // 异步导出，返回任务ID
    const taskId = `export_${Date.now()}`;

    // 这里应该调用队列服务进行异步导出
    // 简化处理，直接返回任务ID
    return { taskId };
  }
}
