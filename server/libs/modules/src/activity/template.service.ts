// libs/modules/src/activity/template.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';
import { AuditService } from '@app/shared/audit';

export interface ActivityTemplate {
  id?: number;
  name: string;
  type: string;
  venueId?: number;
  capacity: number;
  price: number;
  memberPrice?: number;
  cancelPolicy?: any;
  description?: string;
}

@Injectable()
export class ActivityTemplateService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getTemplates(ctx: RequestContext, params: {
    page?: number;
    limit?: number;
    type?: string;
  }) {
    const { page = 1, limit = 20, type } = params;
    const skip = (page - 1) * limit;

    // 使用活动表的草稿状态作为模板
    const where: any = {
      tenantId: ctx.tenantId,
      status: 'draft',
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activity.count({ where }),
    ]);

    const activities = [];
    for (const item of items) {
      const venue = await this.prisma.venue.findUnique({
        where: { id: item.venueId },
      });
      activities.push({ ...item, venue });
    }

    return {
      list: activities,
      total,
      hasMore: skip + activities.length < total,
    };
  }

  async createTemplate(ctx: RequestContext, data: ActivityTemplate) {
    const activity = await this.prisma.activity.create({
      data: {
        tenantId: ctx.tenantId,
        type: data.type,
        venueId: data.venueId || 0,
        title: data.name,
        capacity: data.capacity,
        price: data.price,
        memberPrice: data.memberPrice,
        cancelPolicy: data.cancelPolicy || {
          before_24h: 1.0,
          before_2h: 0.5,
          within_2h: 0,
        },
        status: 'draft',
        playDate: new Date(),
        startAt: new Date(),
        endAt: new Date(),
        createdBy: ctx.userId,
      },
    });

    await this.auditService.log(ctx, {
      category: 'activity',
      action: 'create_template',
      targetType: 'activity_template',
      targetId: String(activity.id),
    });

    return activity;
  }

  async updateTemplate(ctx: RequestContext, templateId: number, data: Partial<ActivityTemplate>) {
    const template = await this.prisma.activity.findFirst({
      where: {
        id: templateId,
        tenantId: ctx.tenantId,
        status: 'draft',
        deletedAt: null,
      },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    return this.prisma.activity.update({
      where: { id: templateId },
      data: {
        title: data.name || template.title,
        type: data.type || template.type,
        venueId: data.venueId || template.venueId,
        capacity: data.capacity || template.capacity,
        price: data.price || template.price,
        memberPrice: data.memberPrice || template.memberPrice,
        cancelPolicy: data.cancelPolicy || template.cancelPolicy,
      },
    });
  }

  async deleteTemplate(ctx: RequestContext, templateId: number) {
    const template = await this.prisma.activity.findFirst({
      where: {
        id: templateId,
        tenantId: ctx.tenantId,
        status: 'draft',
        deletedAt: null,
      },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    await this.prisma.activity.update({
      where: { id: templateId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async applyTemplate(ctx: RequestContext, templateId: number, data: {
    playDate: string;
    startAt: string;
    endAt: string;
    venueId?: number;
  }) {
    const template = await this.prisma.activity.findFirst({
      where: {
        id: templateId,
        tenantId: ctx.tenantId,
        status: 'draft',
        deletedAt: null,
      },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    const activity = await this.prisma.activity.create({
      data: {
        tenantId: ctx.tenantId,
        type: template.type,
        venueId: data.venueId || template.venueId,
        title: template.title,
        capacity: template.capacity,
        price: template.price,
        memberPrice: template.memberPrice,
        cancelPolicy: template.cancelPolicy as any,
        status: 'draft',
        playDate: new Date(data.playDate),
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        createdBy: ctx.userId,
      },
    });

    return activity;
  }

  async copyActivity(ctx: RequestContext, activityId: number, data: {
    playDate: string;
    startAt: string;
    endAt: string;
  }) {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id: activityId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    const newActivity = await this.prisma.activity.create({
      data: {
        tenantId: ctx.tenantId,
        type: activity.type,
        venueId: activity.venueId,
        title: `${activity.title} (副本)`,
        capacity: activity.capacity,
        price: activity.price,
        memberPrice: activity.memberPrice,
        cancelPolicy: activity.cancelPolicy as any,
        status: 'draft',
        playDate: new Date(data.playDate),
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        createdBy: ctx.userId,
      },
    });

    return newActivity;
  }

  async batchCreateFromTemplate(ctx: RequestContext, templateId: number, dates: Array<{
    playDate: string;
    startAt: string;
    endAt: string;
  }>) {
    const template = await this.prisma.activity.findFirst({
      where: {
        id: templateId,
        tenantId: ctx.tenantId,
        status: 'draft',
        deletedAt: null,
      },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ date: string; error: string }>,
    };

    for (const date of dates) {
      try {
        await this.prisma.activity.create({
          data: {
            tenantId: ctx.tenantId,
            type: template.type,
            venueId: template.venueId,
            title: template.title,
            capacity: template.capacity,
            price: template.price,
            memberPrice: template.memberPrice,
            cancelPolicy: template.cancelPolicy as any,
            status: 'draft',
            playDate: new Date(date.playDate),
            startAt: new Date(date.startAt),
            endAt: new Date(date.endAt),
            createdBy: ctx.userId,
          },
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          date: date.playDate,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return results;
  }
}
