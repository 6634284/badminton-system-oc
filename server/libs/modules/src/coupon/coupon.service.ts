// libs/modules/src/coupon/coupon.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  async getCoupons(ctx: RequestContext, params: {
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
      this.prisma.coupon.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      list: items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async getAvailableCoupons(ctx: RequestContext) {
    const now = new Date();

    return this.prisma.coupon.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: 'active',
        stock: { gt: 0 },
        OR: [
          { validFrom: null },
          { validFrom: { lte: now } },
        ],
        AND: [
          { OR: [
            { validTo: null },
            { validTo: { gte: now } },
          ]},
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCoupon(ctx: RequestContext, data: {
    name: string;
    type: string;
    discountValue: number;
    applyScope: string;
    applyTargetId?: number;
    stock: number;
    perUserLimit: number;
    validType: number;
    validFrom?: string;
    validTo?: string;
    validDays?: number;
    minAmount?: number;
    maxDiscount?: number;
  }) {
    return this.prisma.coupon.create({
      data: {
        tenantId: ctx.tenantId,
        name: data.name,
        type: data.type,
        discountValue: data.discountValue,
        applyScope: data.applyScope,
        applyTargetId: data.applyTargetId,
        stock: data.stock,
        perUserLimit: data.perUserLimit,
        validType: data.validType,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        validDays: data.validDays,
        minAmount: data.minAmount,
        maxDiscount: data.maxDiscount,
      },
    });
  }

  async updateCoupon(ctx: RequestContext, couponId: number, data: any) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        tenantId: ctx.tenantId,
      },
    });

    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    return this.prisma.coupon.update({
      where: { id: couponId },
      data,
    });
  }

  async receiveCoupon(ctx: RequestContext, couponId: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        tenantId: ctx.tenantId,
        status: 'active',
        stock: { gt: 0 },
      },
    });

    if (!coupon) {
      throw new NotFoundException('优惠券不存在或已领完');
    }

    // 检查领取限制
    const receivedCount = await this.prisma.userCoupon.count({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        couponId,
      },
    });

    if (receivedCount >= coupon.perUserLimit) {
      throw new BadRequestException('已达到领取上限');
    }

    // 计算有效期
    let validFrom = new Date();
    let validTo: Date | null = null;

    if (coupon.validType === 1 && coupon.validFrom && coupon.validTo) {
      validFrom = coupon.validFrom;
      validTo = coupon.validTo;
    } else if (coupon.validType === 2 && coupon.validDays) {
      validTo = new Date(validFrom.getTime() + coupon.validDays * 24 * 60 * 60 * 1000);
    }

    return this.prisma.$transaction(async (tx) => {
      // 扣减库存
      await tx.coupon.update({
        where: { id: couponId },
        data: { stock: { decrement: 1 } },
      });

      // 创建用户优惠券
      return tx.userCoupon.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          couponId,
          status: 'unused',
          validFrom,
          validTo,
        },
      });
    });
  }

  async getUserCoupons(ctx: RequestContext, params: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) {
    const { page = 1, pageSize = 20, status } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    };

    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.userCoupon.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.userCoupon.count({ where }),
    ]);

    const userCoupons = [];
    for (const item of items) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { id: item.couponId },
      });
      userCoupons.push({ ...item, coupon });
    }

    return {
      list: userCoupons,
      total,
      hasMore: skip + userCoupons.length < total,
    };
  }

  async issueCoupons(ctx: RequestContext, couponId: number, userIds: number[]) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        tenantId: ctx.tenantId,
        status: 'active',
      },
    });

    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    if (coupon.stock < userIds.length) {
      throw new BadRequestException('库存不足');
    }

    const now = new Date();
    const userCoupons = userIds.map((userId) => {
      let validFrom = now;
      let validTo: Date | null = null;

      if (coupon.validType === 1 && coupon.validFrom && coupon.validTo) {
        validFrom = coupon.validFrom;
        validTo = coupon.validTo;
      } else if (coupon.validType === 2 && coupon.validDays) {
        validTo = new Date(validFrom.getTime() + coupon.validDays * 24 * 60 * 60 * 1000);
      }

      return {
        tenantId: ctx.tenantId,
        userId,
        couponId,
        status: 'unused',
        validFrom,
        validTo,
      };
    });

    return this.prisma.$transaction(async (tx) => {
      await tx.coupon.update({
        where: { id: couponId },
        data: { stock: { decrement: userIds.length } },
      });

      return tx.userCoupon.createMany({
        data: userCoupons,
      });
    });
  }

  async useCoupon(ctx: RequestContext, userCouponId: number) {
    const userCoupon = await this.prisma.userCoupon.findFirst({
      where: {
        id: userCouponId,
        userId: ctx.userId,
        status: 'unused',
      },
    });

    if (!userCoupon) {
      throw new NotFoundException('优惠券不存在或已使用');
    }

    const now = new Date();
    if (userCoupon.validTo && userCoupon.validTo < now) {
      throw new BadRequestException('优惠券已过期');
    }

    return this.prisma.userCoupon.update({
      where: { id: userCouponId },
      data: {
        status: 'used',
        usedAt: now,
      },
    });
  }
}
