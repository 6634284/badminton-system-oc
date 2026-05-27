// apps/worker/src/processors/refund.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@app/infra/prisma';
import { WalletService } from '@app/modules/wallet';
import { RequestContext } from '@app/shared/context';

@Processor('refund')
export class RefundProcessor extends WorkerHost {
  private readonly logger = new Logger(RefundProcessor.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Processing refund job: ${job.name}`);

    switch (job.name) {
      case 'activity-cancel':
        return this.handleActivityCancel(job.data);
      case 'registration-cancel':
        return this.handleRegistrationCancel(job.data);
      case 'refund-complete':
        return this.handleRefundComplete(job.data);
      default:
        this.logger.warn(`Unknown refund job: ${job.name}`);
    }
  }

  private async handleActivityCancel(data: { activityId: number; reason: string }) {
    this.logger.log(`Handling activity cancel: ${data.activityId}`);

    // 获取所有需要退款的报名
    const registrations = await this.prisma.activityRegistration.findMany({
      where: {
        activityId: data.activityId,
        status: 'canceled',
      },
    });

    for (const reg of registrations) {
      try {
        // 退款到钱包
        const ctx: RequestContext = {
          traceId: '',
          userId: Number(reg.userId),
          tenantId: Number(reg.tenantId),
          roleCodes: [],
          ip: '',
          userAgent: '',
          now: new Date(),
          locale: 'zh-CN',
        };

        await this.walletService.credit(ctx, Number(reg.userId), Number(reg.payAmount), {
          bizType: 'activity_refund',
          sourceType: 'activity_registration',
          sourceId: Number(reg.id),
          subAccount: 'cash',
          remark: `活动取消退款: ${data.reason}`,
        });

        this.logger.log(`Refund completed for registration: ${reg.id}`);
      } catch (error) {
        this.logger.error(`Refund failed for registration: ${reg.id}`, error);
      }
    }
  }

  private async handleRegistrationCancel(data: { registrationId: number; refundAmount: number }) {
    this.logger.log(`Handling registration cancel: ${data.registrationId}`);

    const registration = await this.prisma.activityRegistration.findUnique({
      where: { id: data.registrationId },
    });

    if (!registration) {
      this.logger.error(`Registration not found: ${data.registrationId}`);
      return;
    }

    const ctx: RequestContext = {
      traceId: '',
      userId: Number(registration.userId),
      tenantId: Number(registration.tenantId),
      roleCodes: [],
      ip: '',
      userAgent: '',
      now: new Date(),
      locale: 'zh-CN',
    };

    await this.walletService.credit(ctx, Number(registration.userId), data.refundAmount, {
      bizType: 'registration_refund',
      sourceType: 'activity_registration',
      sourceId: Number(registration.id),
      subAccount: 'cash',
      remark: '取消报名退款',
    });

    this.logger.log(`Refund completed for registration: ${data.registrationId}`);
  }

  private async handleRefundComplete(data: { bizType: string; bizOrderNo: string; refundId: number }) {
    this.logger.log(`Handling refund complete: ${data.refundId}`);

    // 更新退款单状态
    await this.prisma.refundOrder.update({
      where: { id: data.refundId },
      data: {
        status: 'success',
        refundedAt: new Date(),
      },
    });
  }
}
