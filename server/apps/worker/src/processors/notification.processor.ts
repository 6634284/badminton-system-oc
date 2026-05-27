// apps/worker/src/processors/notification.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@app/infra/prisma';

@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Processing notification job: ${job.name}`);

    switch (job.name) {
      case 'send-sms':
        return this.handleSendSms(job.data);
      case 'send-wechat':
        return this.handleSendWechat(job.data);
      case 'send-push':
        return this.handleSendPush(job.data);
      default:
        this.logger.warn(`Unknown notification job: ${job.name}`);
    }
  }

  private async handleSendSms(data: { phone: string; content: string }) {
    this.logger.log(`Sending SMS to: ${data.phone}`);

    // 实际需要调用短信服务API
    // 这里简化处理
    console.log(`SMS sent to ${data.phone}: ${data.content}`);
  }

  private async handleSendWechat(data: { userId: number; templateId: string; data: any }) {
    this.logger.log(`Sending WeChat message to user: ${data.userId}`);

    // 实际需要调用微信API
    // 这里简化处理
    console.log(`WeChat message sent to user ${data.userId}`);
  }

  private async handleSendPush(data: { userId: number; title: string; content: string }) {
    this.logger.log(`Sending push notification to user: ${data.userId}`);

    // 实际需要调用推送服务API
    // 这里简化处理
    console.log(`Push notification sent to user ${data.userId}: ${data.title}`);
  }
}
