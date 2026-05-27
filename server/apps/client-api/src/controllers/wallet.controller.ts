// apps/client-api/src/controllers/wallet.controller.ts

import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { WalletService } from '@app/modules/wallet';
import { PaymentService } from '@app/modules/payment';

@ApiTags('wallet')
@Controller('api/client/v1/wallet')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(
    private walletService: WalletService,
    private paymentService: PaymentService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取钱包信息' })
  @ApiResponse({ status: 200, description: '成功' })
  async getWallet(@Request() req: any) {
    const balance = await this.walletService.getBalance(req.ctx);

    return {
      code: 0,
      msg: 'ok',
      data: balance,
    };
  }

  @Get('transactions')
  @ApiOperation({ summary: '获取钱包流水' })
  @ApiResponse({ status: 200, description: '成功' })
  async getTransactions(
    @Request() req: any,
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

  @Post('recharge-orders')
  @ApiOperation({ summary: '创建充值订单' })
  @ApiResponse({ status: 200, description: '成功' })
  async createRechargeOrder(
    @Request() req: any,
    @Body() body: { package_id: number; pay_channel: string },
  ) {
    // 简化处理
    const orderNo = `RC${Date.now()}`;

    return {
      code: 0,
      msg: 'ok',
      data: {
        order_no: orderNo,
        pay_amount: 100,
        gift_amount: 10,
        pay_params: {
          timeStamp: String(Math.floor(Date.now() / 1000)),
          nonceStr: 'mock_nonce',
          package: 'prepay_id=wx123',
          signType: 'RSA',
          paySign: 'mock_sign',
        },
      },
    };
  }
}
