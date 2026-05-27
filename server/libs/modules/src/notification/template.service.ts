// libs/modules/src/notification/template.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';

export interface NotificationTemplate {
  id?: number;
  name: string;
  type: 'sms' | 'wechat' | 'push' | 'in_app';
  content: string;
  variables?: string[];
  status?: string;
}

@Injectable()
export class NotificationTemplateService {
  constructor(private prisma: PrismaService) {}

  async getTemplates(ctx: RequestContext, params: {
    page?: number;
    limit?: number;
    type?: string;
  }) {
    const { page = 1, limit = 20, type } = params;
    const skip = (page - 1) * limit;

    // 简化处理，使用通知表查询模板
    const where: any = {
      tenantId: ctx.tenantId,
      bizType: 'template',
    };

    if (type) {
      where.channel = type;
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

  async createTemplate(ctx: RequestContext, data: NotificationTemplate) {
    // 使用通知表存储模板
    const template = await this.prisma.notification.create({
      data: {
        tenantId: ctx.tenantId,
        userId: 0,
        bizType: 'template',
        bizId: data.name,
        title: data.name,
        content: data.content,
        channel: data.type,
      },
    });

    return template;
  }

  async updateTemplate(ctx: RequestContext, templateId: number, data: Partial<NotificationTemplate>) {
    const template = await this.prisma.notification.findFirst({
      where: {
        id: templateId,
        tenantId: ctx.tenantId,
        bizType: 'template',
      },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    return this.prisma.notification.update({
      where: { id: templateId },
      data: {
        title: data.name || template.title,
        content: data.content || template.content,
        channel: data.type || template.channel,
      },
    });
  }

  async deleteTemplate(ctx: RequestContext, templateId: number) {
    const template = await this.prisma.notification.findFirst({
      where: {
        id: templateId,
        tenantId: ctx.tenantId,
        bizType: 'template',
      },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    await this.prisma.notification.delete({
      where: { id: templateId },
    });

    return { success: true };
  }

  async renderTemplate(templateId: number, variables: Record<string, string>): Promise<string> {
    const template = await this.prisma.notification.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    let content = template.content;

    // 替换变量
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return content;
  }

  async getDefaultTemplates() {
    return [
      {
        name: '活动报名成功',
        type: 'in_app',
        content: '您已成功报名活动「{{activity_title}}」，活动时间：{{activity_time}}，地点：{{venue_name}}。',
        variables: ['activity_title', 'activity_time', 'venue_name'],
      },
      {
        name: '活动取消通知',
        type: 'in_app',
        content: '很抱歉，活动「{{activity_title}}」已取消，退款将在1-3个工作日内到账。',
        variables: ['activity_title'],
      },
      {
        name: '充值成功',
        type: 'in_app',
        content: '充值成功！充值金额：¥{{amount}}，赠送金额：¥{{gift_amount}}，当前余额：¥{{balance}}。',
        variables: ['amount', 'gift_amount', 'balance'],
      },
      {
        name: '签到提醒',
        type: 'in_app',
        content: '您报名的活动「{{activity_title}}」将在30分钟后开始，请准时到场签到。',
        variables: ['activity_title'],
      },
      {
        name: '候补成功',
        type: 'in_app',
        content: '恭喜！您已成功候补到活动「{{activity_title}}」的名额，请在{{deadline}}前完成支付。',
        variables: ['activity_title', 'deadline'],
      },
    ];
  }
}
