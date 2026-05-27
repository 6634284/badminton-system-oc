// apps/client-api/src/controllers/coupon.controller.ts

import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { CouponService } from '@app/modules/coupon';

@ApiTags('coupons')
@Controller('api/client/v1/coupons')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class CouponController {
  constructor(private couponService: CouponService) {}

  @Get('available')
  @ApiOperation({ summary: '获取可领取优惠券' })
  @ApiResponse({ status: 200, description: '成功' })
  async getAvailableCoupons(@Request() req: any) {
    const coupons = await this.couponService.getAvailableCoupons(req.ctx);

    return {
      code: 0,
      msg: 'ok',
      data: coupons,
    };
  }

  @Post(':id/receive')
  @ApiOperation({ summary: '领取优惠券' })
  @ApiResponse({ status: 200, description: '成功' })
  async receiveCoupon(@Request() req: any, @Param('id') id: number) {
    const result = await this.couponService.receiveCoupon(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Get('user-coupons')
  @ApiOperation({ summary: '获取我的优惠券' })
  @ApiResponse({ status: 200, description: '成功' })
  async getUserCoupons(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const result = await this.couponService.getUserCoupons(req.ctx, {
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
}
