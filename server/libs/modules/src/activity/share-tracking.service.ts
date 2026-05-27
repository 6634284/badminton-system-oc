// libs/modules/src/activity/share-tracking.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';
import { nanoid } from 'nanoid';

export interface ShareTokenStats {
  token: string;
  activityId: number;
  sharerUserId?: number;
  channel?: string;
  registerCount: number;
  createdAt: Date;
}

@Injectable()
export class ShareTrackingService {
  private readonly logger = new Logger(ShareTrackingService.name);

  constructor(private prisma: PrismaService) {}

  async createShareToken(ctx: RequestContext, activityId: number, channel?: string): Promise<string> {
    const token = `SH${nanoid(16)}`;

    await this.prisma.activityShareToken.create({
      data: {
        tenantId: ctx.tenantId,
        activityId,
        token,
        sharerUserId: ctx.userId,
        channel,
        registerCount: 0,
      },
    });

    return token;
  }

  async trackShare(token: string): Promise<void> {
    await this.prisma.activityShareToken.updateMany({
      where: { token },
      data: { registerCount: { increment: 1 } },
    });
  }

  async getShareStats(ctx: RequestContext, activityId: number): Promise<ShareTokenStats[]> {
    const tokens = await this.prisma.activityShareToken.findMany({
      where: {
        tenantId: ctx.tenantId,
        activityId,
      },
      orderBy: { registerCount: 'desc' },
    });

    return tokens.map((t) => ({
      token: t.token,
      activityId: Number(t.activityId),
      sharerUserId: t.sharerUserId ? Number(t.sharerUserId) : undefined,
      channel: t.channel || undefined,
      registerCount: t.registerCount,
      createdAt: t.createdAt,
    }));
  }

  async getShareReport(ctx: RequestContext, params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'channel' | 'activity' | 'sharer';
  }) {
    const { startDate, endDate, groupBy = 'channel' } = params;

    const where: any = {
      tenantId: ctx.tenantId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const tokens = await this.prisma.activityShareToken.findMany({
      where,
    });

    // 按维度分组统计
    const grouped: Record<string, {
      tokenCount: number;
      registerCount: number;
    }> = {};

    for (const token of tokens) {
      let key: string;

      switch (groupBy) {
        case 'channel':
          key = token.channel || 'unknown';
          break;
        case 'activity':
          key = String(token.activityId);
          break;
        case 'sharer':
          key = token.sharerUserId ? String(token.sharerUserId) : 'unknown';
          break;
        default:
          key = 'total';
      }

      if (!grouped[key]) {
        grouped[key] = { tokenCount: 0, registerCount: 0 };
      }

      grouped[key].tokenCount++;
      grouped[key].registerCount += token.registerCount;
    }

    return {
      totalTokens: tokens.length,
      totalRegisters: tokens.reduce((sum, t) => sum + t.registerCount, 0),
      byGroup: Object.entries(grouped).map(([key, value]) => ({
        group: key,
        ...value,
      })),
    };
  }

  async getTopSharers(ctx: RequestContext, limit: number = 10) {
    const topSharers = await this.prisma.activityShareToken.groupBy({
      by: ['sharerUserId'],
      where: {
        tenantId: ctx.tenantId,
        sharerUserId: { not: null },
      },
      _sum: { registerCount: true },
      _count: { id: true },
      orderBy: {
        _sum: { registerCount: 'desc' },
      },
      take: limit,
    });

    const result = [];
    for (const sharer of topSharers) {
      if (!sharer.sharerUserId) continue;

      const user = await this.prisma.user.findUnique({
        where: { id: sharer.sharerUserId },
        select: { id: true, nickname: true, avatarUrl: true },
      });

      result.push({
        userId: Number(sharer.sharerUserId),
        nickname: user?.nickname || '未知用户',
        avatarUrl: user?.avatarUrl,
        totalRegisters: sharer._sum.registerCount || 0,
        shareCount: sharer._count.id,
      });
    }

    return result;
  }
}
