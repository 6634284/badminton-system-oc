// libs/modules/src/notification/notification.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { QueueService } from '@app/infra/queue';
import { RequestContext } from '@app/shared/context';
import { AuditService } from '@app/shared/audit';
import { SendNotificationDto, SendBatchNotificationDto, NotificationQueryDto } from './dto';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private auditService: AuditService,
  ) {}

  async getNotifications(ctx: RequestContext, params: NotificationQueryDto) {
    const { page = 1, limit = 20, isRead } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      list: items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async getUnreadCount(ctx: RequestContext) {
    return this.prisma.notification.count({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        isRead: false,
      },
    });
  }

  async getNotificationById(ctx: RequestContext, notificationId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    return notification;
  }

  async markAsRead(ctx: RequestContext, notificationId: number) {
    await this.getNotificationById(ctx, notificationId);

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(ctx: RequestContext) {
    return this.prisma.notification.updateMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async createNotification(data: SendNotificationDto & { tenantId: number }) {
    return this.prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        bizType: data.bizType,
        bizId: data.bizId,
        title: data.title,
        content: data.content,
        channel: data.channel,
      },
    });
  }

  async sendNotification(ctx: RequestContext, data: SendNotificationDto) {
    await this.createNotification({
      ...data,
      tenantId: ctx.tenantId,
    });

    switch (data.channel) {
      case 'sms':
        await this.queueService.addJob('notification', 'send-sms', {
          userId: data.userId,
          content: data.content,
        });
        break;
      case 'wechat':
        await this.queueService.addJob('notification', 'send-wechat', {
          userId: data.userId,
          templateId: '',
          data: { content: data.content },
        });
        break;
      case 'push':
        await this.queueService.addJob('notification', 'send-push', {
          userId: data.userId,
          title: data.title,
          content: data.content,
        });
        break;
    }

    await this.auditService.log(ctx, {
      category: 'notification',
      action: 'send',
      targetType: 'notification',
      payload: { userId: data.userId, channel: data.channel, bizType: data.bizType },
    });

    return { success: true };
  }

  async sendBatchNotification(ctx: RequestContext, data: SendBatchNotificationDto) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ userId: number; error: string }>,
    };

    for (const userId of data.userIds) {
      try {
        await this.sendNotification(ctx, {
          ...data,
          userId,
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return results;
  }

  async deleteNotification(ctx: RequestContext, notificationId: number) {
    await this.getNotificationById(ctx, notificationId);

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  }

  async getNotificationStats(ctx: RequestContext) {
    const [total, unread, todaySent] = await Promise.all([
      this.prisma.notification.count({
        where: { tenantId: ctx.tenantId, userId: ctx.userId },
      }),
      this.prisma.notification.count({
        where: { tenantId: ctx.tenantId, userId: ctx.userId, isRead: false },
      }),
      this.prisma.notification.count({
        where: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      total,
      unread,
      todaySent,
    };
  }
}
