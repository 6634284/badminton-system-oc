// libs/modules/src/payment/payment.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { QueueService } from '@app/infra/queue';
import { RequestContext } from '@app/shared/context';
import { WechatPayService } from './wechat-pay.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private wechatPayService: WechatPayService,
  ) {}

  async createPaymentOrder(ctx: RequestContext, data: {
    bizType: string;
    bizOrderNo: string;
    amount: number;
    payChannel: string;
  }) {
    const outTradeNo = this.generateOutTradeNo();

    const order = await this.prisma.paymentOrder.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        outTradeNo,
        bizType: data.bizType,
        bizOrderNo: data.bizOrderNo,
        payChannel: data.payChannel,
        amount: data.amount,
        status: 'created',
      },
    });

    // 如果是微信支付，调用微信API
    let payParams = null;
    if (data.payChannel === 'wechat') {
      payParams = await this.createWechatPayment(order);
    }

    return {
      orderId: order.id,
      outTradeNo,
      payParams,
    };
  }

  async handlePaymentCallback(data: {
    outTradeNo: string;
    status: string;
    paidAt?: Date;
    notifyPayload?: any;
  }) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { outTradeNo: data.outTradeNo },
    });

    if (!order) {
      throw new NotFoundException('支付单不存在');
    }

    if (order.status === 'paid') {
      return { success: true, message: 'already paid' };
    }

    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: data.status,
        paidAt: data.paidAt,
        notifyPayload: data.notifyPayload,
      },
    });

    if (data.status === 'paid') {
      await this.handleBusinessPayment(order.bizType, order.bizOrderNo, Number(order.id));
    }

    return { success: true };
  }

  async createRefund(ctx: RequestContext, data: {
    paymentId: number;
    refundAmount: number;
    reason: string;
  }) {
    const payment = await this.prisma.paymentOrder.findUnique({
      where: { id: data.paymentId },
    });

    if (!payment) {
      throw new NotFoundException('支付单不存在');
    }

    if (payment.status !== 'paid') {
      throw new BadRequestException('只有已支付的订单可以退款');
    }

    const refundNo = this.generateRefundNo();

    const refund = await this.prisma.refundOrder.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        refundNo,
        paymentId: data.paymentId,
        bizType: payment.bizType,
        bizOrderNo: payment.bizOrderNo,
        refundAmount: data.refundAmount,
        status: 'pending',
      },
    });

    // 调用微信退款API
    if (payment.payChannel === 'wechat') {
      await this.createWechatRefund(payment, refund);
    }

    return refund;
  }

  async handleRefundCallback(data: {
    refundNo: string;
    status: string;
    refundedAt?: Date;
  }) {
    const refund = await this.prisma.refundOrder.findUnique({
      where: { refundNo: data.refundNo },
    });

    if (!refund) {
      throw new NotFoundException('退款单不存在');
    }

    await this.prisma.refundOrder.update({
      where: { id: refund.id },
      data: {
        status: data.status,
        refundedAt: data.refundedAt,
      },
    });

    if (data.status === 'success') {
      await this.handleBusinessRefund(refund.bizType, refund.bizOrderNo, Number(refund.id));
    }

    return { success: true };
  }

  async getPaymentOrders(ctx: RequestContext, params: {
    page?: number;
    pageSize?: number;
    bizType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, pageSize = 20, bizType, status, startDate, endDate } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: ctx.tenantId,
    };

    if (bizType) where.bizType = bizType;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentOrder.count({ where }),
    ]);

    return {
      list: items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async getRefundOrders(ctx: RequestContext, params: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) {
    const { page = 1, pageSize = 20, status } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: ctx.tenantId,
    };

    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.refundOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.refundOrder.count({ where }),
    ]);

    return {
      list: items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  private async createWechatPayment(order: any): Promise<any> {
    return this.wechatPayService.createUnifiedOrder({
      body: `订单${order.bizOrderNo}`,
      outTradeNo: order.outTradeNo,
      totalFee: Math.round(Number(order.amount) * 100),
      notifyUrl: '/api/open/v1/payments/wechat/notify',
    });
  }

  private async createWechatRefund(payment: any, refund: any): Promise<void> {
    await this.wechatPayService.refund({
      outTradeNo: payment.outTradeNo,
      outRefundNo: refund.refundNo,
      totalFee: Math.round(Number(payment.amount) * 100),
      refundFee: Math.round(Number(refund.refundAmount) * 100),
    });
  }

  private async handleBusinessPayment(bizType: string, bizOrderNo: string, paymentId: number): Promise<void> {
    // 根据业务类型处理
    switch (bizType) {
      case 'recharge':
        // 充值订单，需要入账钱包
        await this.queueService.addJob('payment', 'recharge-complete', {
          bizOrderNo,
          paymentId,
        });
        break;
      case 'activity':
        // 活动报名，确认报名
        await this.queueService.addJob('payment', 'activity-paid', {
          bizOrderNo,
          paymentId,
        });
        break;
      case 'mall':
        // 商城订单，更新订单状态
        await this.queueService.addJob('payment', 'mall-order-paid', {
          bizOrderNo,
          paymentId,
        });
        break;
    }
  }

  private async handleBusinessRefund(bizType: string, bizOrderNo: string, refundId: number): Promise<void> {
    // 根据业务类型处理退款
    await this.queueService.addJob('refund', 'refund-complete', {
      bizType,
      bizOrderNo,
      refundId,
    });
  }

  private generateOutTradeNo(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAY${dateStr}${random}`;
  }

  private generateRefundNo(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RF${dateStr}${random}`;
  }

  private generateNonceStr(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
