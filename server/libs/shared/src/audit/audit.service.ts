// libs/shared/src/audit/audit.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '../context';

export interface AuditLogData {
  category: string;
  action: string;
  targetType?: string;
  targetId?: string;
  riskLevel?: number;
  beforeJson?: any;
  afterJson?: any;
  payload?: any;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  category?: string;
  action?: string;
  targetType?: string;
  operatorId?: number;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(ctx: RequestContext, data: AuditLogData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        operatorId: ctx.userId,
        operatorType: 'user',
        category: data.category,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        riskLevel: data.riskLevel || 1,
        beforeJson: data.beforeJson,
        afterJson: data.afterJson,
        payload: data.payload,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        traceId: ctx.traceId,
      },
    });
  }

  async logSystemAction(
    tenantId: number,
    data: AuditLogData & { reason: string },
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        operatorId: 0,
        operatorType: 'system',
        category: data.category,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        riskLevel: data.riskLevel || 1,
        beforeJson: data.beforeJson,
        afterJson: data.afterJson,
        payload: { ...data.payload, reason: data.reason },
      },
    });
  }

  async logLogin(tenantId: number, userId: number, data: {
    ip: string;
    userAgent: string;
    success: boolean;
    reason?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        operatorId: userId,
        operatorType: 'user',
        category: 'auth',
        action: data.success ? 'login_success' : 'login_failed',
        riskLevel: data.success ? 1 : 2,
        payload: { reason: data.reason },
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  }

  async getAuditLogs(ctx: RequestContext, query: AuditLogQuery) {
    const { page = 1, limit = 20, category, action, targetType, operatorId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: ctx.tenantId,
    };

    if (category) where.category = category;
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (operatorId) where.operatorId = operatorId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      list: items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async getAuditLogStats(ctx: RequestContext, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const [totalLogs, categoryStats, riskStats] = await Promise.all([
      this.prisma.auditLog.count({
        where: {
          tenantId: ctx.tenantId,
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['category'],
        where: {
          tenantId: ctx.tenantId,
          createdAt: { gte: start, lte: end },
        },
        _count: { id: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['riskLevel'],
        where: {
          tenantId: ctx.tenantId,
          createdAt: { gte: start, lte: end },
        },
        _count: { id: true },
      }),
    ]);

    return {
      totalLogs,
      byCategory: categoryStats.map((s) => ({
        category: s.category,
        count: s._count.id,
      })),
      byRiskLevel: riskStats.map((s) => ({
        riskLevel: s.riskLevel,
        count: s._count.id,
      })),
    };
  }
}
