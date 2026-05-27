// apps/worker/src/processors/notification.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@app/infra/prisma';
import { ConfigService } from '@nestjs/config';

interface SmsPayload {
  phone: string;
  content: string;
  templateId?: string;
  params?: Record<string, string>;
}

interface WechatPayload {
  userId: number;
  templateId: string;
  data: Record<string, string>;
  page?: string;
}

interface PushPayload {
  userId: number;
  title: string;
  content: string;
  data?: Record<string, string>;
}

@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly isMock: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    super();
    this.isMock = this.configService.get('WECHAT_MOCK', 'true') === 'true';
  }

  async process(job: Job) {
    this.logger.log(`Processing notification job: ${job.name}`);

    switch (job.name) {
      case 'send-sms':
        return this.handleSendSms(job.data as SmsPayload);
      case 'send-wechat':
        return this.handleSendWechat(job.data as WechatPayload);
      case 'send-push':
        return this.handleSendPush(job.data as PushPayload);
      default:
        this.logger.warn(`Unknown notification job: ${job.name}`);
    }
  }

  private async handleSendSms(data: SmsPayload) {
    this.logger.log(`[SMS] Sending to: ${data.phone}`);

    if (this.isMock) {
      this.logger.log(`[MOCK SMS] Content: ${data.content}`);
      return { success: true, mock: true };
    }

    try {
      // TODO: 实现真实短信发送 (阿里云/腾讯云短信API)
      this.logger.log(`[SMS] Sent successfully to ${data.phone}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`[SMS] Failed to send to ${data.phone}`, error);
      throw error;
    }
  }

  private async handleSendWechat(data: WechatPayload) {
    this.logger.log(`[WeChat] Sending to user: ${data.userId}`);

    if (this.isMock) {
      this.logger.log(`[MOCK WeChat] Template: ${data.templateId}`);
      return { success: true, mock: true };
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        this.logger.warn(`[WeChat] User ${data.userId} not found`);
        return { success: false, reason: 'user_not_found' };
      }

      // TODO: 实现真实微信订阅消息发送
      this.logger.log(`[WeChat] Sent successfully to user ${data.userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`[WeChat] Failed to send to user ${data.userId}`, error);
      throw error;
    }
  }

  private async handleSendPush(data: PushPayload) {
    this.logger.log(`[Push] Sending to user: ${data.userId}`);

    if (this.isMock) {
      this.logger.log(`[MOCK Push] Title: ${data.title}`);
      return { success: true, mock: true };
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        this.logger.warn(`[Push] User ${data.userId} not found`);
        return { success: false, reason: 'user_not_found' };
      }

      // TODO: 实现真实推送发送 (极光/个推/FCM)
      this.logger.log(`[Push] Sent successfully to user ${data.userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`[Push] Failed to send to user ${data.userId}`, error);
      throw error;
    }
  }
}
