// apps/admin-api/src/controllers/wallet.controller.ts

import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { WalletService } from '@app/modules/wallet';
import { PaymentService } from '@app/modules/payment';

@ApiTags('wallets')
@Controller('api/admin/v1/wallets')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(
    private walletService: WalletService,
    private paymentService: PaymentService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取钱包列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getWallets(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // 简化处理
    return {
      code: 0,
      msg: 'ok',
      data: { list: [], total: 0, has_more: false },
    };
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: '获取钱包流水' })
  @ApiResponse({ status: 200, description: '成功' })
  async getTransactions(
    @Request() req: any,
    @Param('id') id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('biz_type') bizType?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const result = await this.walletService.getTransactions(req.ctx, {
      page,
      pageSize: limit,
      bizType,
      startDate,
      endDate,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: '余额调整' })
  @ApiResponse({ status: 200, description: '成功' })
  async adjustBalance(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: {
      type: 'increase' | 'decrease';
      amount: number;
      sub_account: 'cash' | 'gift';
      remark: string;
    },
  ) {
    const result = await this.walletService.adjustBalance(req.ctx, id, body.amount, {
      type: body.type,
      amount: body.amount,
      subAccount: body.sub_account,
      remark: body.remark,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Get('payment-orders')
  @ApiOperation({ summary: '获取支付单列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getPaymentOrders(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('biz_type') bizType?: string,
    @Query('status') status?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const result = await this.paymentService.getPaymentOrders(req.ctx, {
      page: page || 1,
      pageSize: limit || 20,
      bizType,
      status,
      startDate,
      endDate,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Get('refund-orders')
  @ApiOperation({ summary: '获取退款单列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getRefundOrders(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const result = await this.paymentService.getRefundOrders(req.ctx, {
      page,
      pageSize: limit,
      status,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Post('refunds')
  @ApiOperation({ summary: '人工退款' })
  @ApiResponse({ status: 200, description: '成功' })
  async createRefund(
    @Request() req: any,
    @Body() body: {
      payment_id: number;
      refund_amount: number;
      reason: string;
    },
  ) {
    const result = await this.paymentService.createRefund(req.ctx, {
      paymentId: body.payment_id,
      refundAmount: body.refund_amount,
      reason: body.reason,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Get('recharge-packages')
  @ApiOperation({ summary: '获取充值套餐' })
  @ApiResponse({ status: 200, description: '成功' })
  async getRechargePackages(@Request() req: any) {
    // 简化处理
    return {
      code: 0,
      msg: 'ok',
      data: [
        { id: 1, name: '充100送10', charge_amount: 100, gift_amount: 10 },
        { id: 2, name: '充500送80', charge_amount: 500, gift_amount: 80 },
        { id: 3, name: '充1000送200', charge_amount: 1000, gift_amount: 200 },
      ],
    };
  }

  @Post('recharge-packages')
  @ApiOperation({ summary: '创建充值套餐' })
  @ApiResponse({ status: 200, description: '成功' })
  async createRechargePackage(
    @Request() req: any,
    @Body() body: {
      name: string;
      charge_amount: number;
      gift_amount: number;
      sort?: number;
    },
  ) {
    // 简化处理
    return {
      code: 0,
      msg: 'ok',
      data: { id: Date.now(), ...body },
    };
  }
}
