// libs/modules/src/activity/batch.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { QueueService } from '@app/infra/queue';
import { RequestContext } from '@app/shared/context';
import { AuditService } from '@app/shared/audit';

export interface BatchPublishResult {
  success: number;
  failed: number;
  errors: Array<{ date: string; error: string }>;
}

@Injectable()
export class ActivityBatchService {
  private readonly logger = new Logger(ActivityBatchService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private auditService: AuditService,
  ) {}

  async batchPublish(ctx: RequestContext, activityIds: number[]): Promise<BatchPublishResult> {
    const result: BatchPublishResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const activityId of activityIds) {
      try {
        const activity = await this.prisma.activity.findFirst({
          where: {
            id: activityId,
            tenantId: ctx.tenantId,
            status: 'draft',
            deletedAt: null,
          },
        });

        if (!activity) {
          result.failed++;
          result.errors.push({
            date: String(activityId),
            error: '活动不存在或状态不允许发布',
          });
          continue;
        }

        await this.prisma.activity.update({
          where: { id: activityId },
          data: { status: 'published' },
        });

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          date: String(activityId),
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    await this.auditService.log(ctx, {
      category: 'activity',
      action: 'batch_publish',
      targetType: 'activity',
      payload: { activityIds, result },
    });

    return result;
  }

  async createPeriodicActivities(ctx: RequestContext, data: {
    templateId: number;
    startDate: string;
    endDate: string;
    weekdays: number[];
    startTime: string;
    endTime: string;
    venueId?: number;
  }): Promise<BatchPublishResult> {
    const template = await this.prisma.activity.findFirst({
      where: {
        id: data.templateId,
        tenantId: ctx.tenantId,
        status: 'draft',
        deletedAt: null,
      },
    });

    if (!template) {
      throw new BadRequestException('模板不存在');
    }

    const result: BatchPublishResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const dates: Date[] = [];

    // 生成日期列表
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (data.weekdays.includes(d.getDay())) {
        dates.push(new Date(d));
      }
    }

    for (const date of dates) {
      try {
        const [startHour, startMinute] = data.startTime.split(':').map(Number);
        const [endHour, endMinute] = data.endTime.split(':').map(Number);

        const startAt = new Date(date);
        startAt.setHours(startHour, startMinute, 0, 0);

        const endAt = new Date(date);
        endAt.setHours(endHour, endMinute, 0, 0);

        await this.prisma.activity.create({
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
            playDate: date,
            startAt,
            endAt,
            createdBy: ctx.userId,
          },
        });

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          date: date.toISOString().slice(0, 10),
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    await this.auditService.log(ctx, {
      category: 'activity',
      action: 'create_periodic',
      targetType: 'activity_template',
      targetId: String(data.templateId),
      payload: { data, result },
    });

    return result;
  }

  async batchCancel(ctx: RequestContext, activityIds: number[], reason: string): Promise<BatchPublishResult> {
    const result: BatchPublishResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const activityId of activityIds) {
      try {
        const activity = await this.prisma.activity.findFirst({
          where: {
            id: activityId,
            tenantId: ctx.tenantId,
            status: { in: ['published', 'registering', 'full'] },
            deletedAt: null,
          },
        });

        if (!activity) {
          result.failed++;
          result.errors.push({
            date: String(activityId),
            error: '活动不存在或状态不允许取消',
          });
          continue;
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.activity.update({
            where: { id: activityId },
            data: { status: 'canceled' },
          });

          await tx.activityRegistration.updateMany({
            where: {
              activityId,
              status: { in: ['paying', 'confirmed'] },
            },
            data: { status: 'canceled', canceledAt: new Date() },
          });
        });

        // 触发退款任务
        await this.queueService.addJob('refund', 'activity-cancel', {
          activityId,
          reason,
        });

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          date: String(activityId),
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    await this.auditService.log(ctx, {
      category: 'activity',
      action: 'batch_cancel',
      targetType: 'activity',
      payload: { activityIds, reason, result },
    });

    return result;
  }

  async getBatchStatus(ctx: RequestContext, taskId: string) {
    // 从 Redis 获取批量任务状态
    // 简化处理
    return {
      taskId,
      status: 'completed',
      result: {
        success: 0,
        failed: 0,
        errors: [],
      },
    };
  }
}
