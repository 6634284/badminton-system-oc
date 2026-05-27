// libs/modules/src/wallet/wallet.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';
import { AuditService } from '@app/shared/audit';
import { InsufficientBalanceError } from '@app/shared/errors';
import { AdjustBalanceDto, WalletQueryDto } from './dto';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getWallet(ctx: RequestContext, userId?: number) {
    const targetUserId = userId || ctx.userId;

    let wallet = await this.prisma.wallet.findFirst({
      where: {
        tenantId: ctx.tenantId,
        userId: targetUserId,
        deletedAt: null,
      },
    });

    if (!wallet) {
      // 自动创建钱包
      wallet = await this.prisma.wallet.create({
        data: {
          tenantId: ctx.tenantId,
          userId: targetUserId,
          cashBalance: 0,
          giftBalance: 0,
          frozenBalance: 0,
        },
      });
    }

    return wallet;
  }

  async getBalance(ctx: RequestContext, userId?: number) {
    const wallet = await this.getWallet(ctx, userId);
    return {
      cashBalance: wallet.cashBalance,
      giftBalance: wallet.giftBalance,
      frozenBalance: wallet.frozenBalance,
      totalBalance: Number(wallet.cashBalance) + Number(wallet.giftBalance),
    };
  }

  async getTransactions(ctx: RequestContext, params: {
    userId?: number;
    page?: number;
    pageSize?: number;
    bizType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { userId, page = 1, pageSize = 20, bizType, startDate, endDate } = params;
    const targetUserId = userId || ctx.userId;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: ctx.tenantId,
      userId: targetUserId,
    };

    if (bizType) {
      where.bizType = bizType;
    }

    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = new Date(startDate);
      if (endDate) where.occurredAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      list: items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async debit(ctx: RequestContext, userId: number, amount: number, data: {
    bizType: string;
    sourceType: string;
    sourceId: number;
    remark?: string;
  }): Promise<boolean> {
    if (amount <= 0) {
      throw new BadRequestException('扣款金额必须大于0');
    }

    const wallet = await this.getWallet(ctx, userId);
    const totalBalance = Number(wallet.cashBalance) + Number(wallet.giftBalance);

    if (totalBalance < amount) {
      throw new InsufficientBalanceError();
    }

    let giftDebit = 0;
    let cashDebit = 0;
    let remaining = amount;

    if (Number(wallet.giftBalance) > 0) {
      giftDebit = Math.min(Number(wallet.giftBalance), remaining);
      remaining -= giftDebit;
    }

    if (remaining > 0) {
      cashDebit = remaining;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          version: wallet.version,
          giftBalance: { gte: giftDebit },
          cashBalance: { gte: cashDebit },
        },
        data: {
          giftBalance: { decrement: giftDebit },
          cashBalance: { decrement: cashDebit },
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new InsufficientBalanceError();
      }

      if (giftDebit > 0) {
        await tx.walletTransaction.create({
          data: {
            tenantId: ctx.tenantId,
            walletId: wallet.id,
            userId,
            direction: 'D',
            amount: giftDebit,
            subAccount: 'gift',
            bizType: data.bizType,
            sourceType: data.sourceType,
            sourceId: data.sourceId,
            remark: data.remark,
          },
        });
      }

      if (cashDebit > 0) {
        await tx.walletTransaction.create({
          data: {
            tenantId: ctx.tenantId,
            walletId: wallet.id,
            userId,
            direction: 'D',
            amount: cashDebit,
            subAccount: 'cash',
            bizType: data.bizType,
            sourceType: data.sourceType,
            sourceId: data.sourceId,
            remark: data.remark,
          },
        });
      }

      return true;
    });

    await this.auditService.log(ctx, {
      category: 'wallet',
      action: 'debit',
      targetType: 'wallet',
      targetId: String(wallet.id),
      payload: { userId, amount, bizType: data.bizType, sourceType: data.sourceType },
    });

    return result;
  }

  async credit(ctx: RequestContext, userId: number, amount: number, data: {
    bizType: string;
    sourceType: string;
    sourceId: number;
    subAccount?: 'cash' | 'gift';
    remark?: string;
  }): Promise<boolean> {
    if (amount <= 0) {
      throw new BadRequestException('入账金额必须大于0');
    }

    const wallet = await this.getWallet(ctx, userId);
    const subAccount = data.subAccount || 'cash';

    await this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        version: { increment: 1 },
        updatedAt: new Date(),
      };

      if (subAccount === 'gift') {
        updateData.giftBalance = { increment: amount };
      } else {
        updateData.cashBalance = { increment: amount };
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: updateData,
      });

      await tx.walletTransaction.create({
        data: {
          tenantId: ctx.tenantId,
          walletId: wallet.id,
          userId,
          direction: 'C',
          amount,
          subAccount,
          bizType: data.bizType,
          sourceType: data.sourceType,
          sourceId: data.sourceId,
          remark: data.remark,
        },
      });
    });

    await this.auditService.log(ctx, {
      category: 'wallet',
      action: 'credit',
      targetType: 'wallet',
      targetId: String(wallet.id),
      payload: { userId, amount, ...data },
    });

    return true;
  }

  async adjustBalance(ctx: RequestContext, userId: number, amount: number, data: AdjustBalanceDto): Promise<boolean> {
    const wallet = await this.getWallet(ctx, userId);

    if (data.type === 'decrease') {
      const balance = data.subAccount === 'cash'
        ? Number(wallet.cashBalance)
        : Number(wallet.giftBalance);

      if (balance < amount) {
        throw new InsufficientBalanceError();
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        version: { increment: 1 },
        updatedAt: new Date(),
      };

      if (data.type === 'increase') {
        if (data.subAccount === 'gift') {
          updateData.giftBalance = { increment: amount };
        } else {
          updateData.cashBalance = { increment: amount };
        }
      } else {
        if (data.subAccount === 'gift') {
          updateData.giftBalance = { decrement: amount };
        } else {
          updateData.cashBalance = { decrement: amount };
        }
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: updateData,
      });

      await tx.walletTransaction.create({
        data: {
          tenantId: ctx.tenantId,
          walletId: wallet.id,
          userId,
          direction: data.type === 'increase' ? 'C' : 'D',
          amount,
          subAccount: data.subAccount,
          bizType: 'manual_adjust',
          sourceType: 'admin',
          sourceId: 0,
          remark: data.remark,
        },
      });
    });

    await this.auditService.log(ctx, {
      category: 'wallet',
      action: 'adjust_balance',
      targetType: 'wallet',
      targetId: String(wallet.id),
      riskLevel: 3,
      payload: { userId, amount, type: data.type, subAccount: data.subAccount },
    });

    return true;
  }
}
