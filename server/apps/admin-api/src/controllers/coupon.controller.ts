// apps/admin-api/src/controllers/coupon.controller.ts

import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { CouponService } from '@app/modules/coupon';

@ApiTags('coupons')
@Controller('api/admin/v1/coupons')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class CouponController {
  constructor(private couponService: CouponService) {}

  @Get()
  @ApiOperation({ summary: '获取优惠券列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getCoupons(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const result = await this.couponService.getCoupons(req.ctx, {
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

  @Post()
  @ApiOperation({ summary: '创建优惠券' })
  @ApiResponse({ status: 200, description: '成功' })
  async createCoupon(
    @Request() req: any,
    @Body() body: {
      name: string;
      type: string;
      discount_value: number;
      apply_scope: string;
      apply_target_id?: number;
      stock: number;
      per_user_limit: number;
      valid_type: number;
      valid_from?: string;
      valid_to?: string;
      valid_days?: number;
    },
  ) {
    const coupon = await this.couponService.createCoupon(req.ctx, {
      name: body.name,
      type: body.type,
      discountValue: body.discount_value,
      applyScope: body.apply_scope,
      applyTargetId: body.apply_target_id,
      stock: body.stock,
      perUserLimit: body.per_user_limit,
      validType: body.valid_type,
      validFrom: body.valid_from,
      validTo: body.valid_to,
      validDays: body.valid_days,
    });

    return {
      code: 0,
      msg: 'ok',
      data: coupon,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新优惠券' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateCoupon(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: any,
  ) {
    const coupon = await this.couponService.updateCoupon(req.ctx, id, body);

    return {
      code: 0,
      msg: 'ok',
      data: coupon,
    };
  }

  @Post(':id/issue')
  @ApiOperation({ summary: '批量发放优惠券' })
  @ApiResponse({ status: 200, description: '成功' })
  async issueCoupons(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: { user_ids: number[] },
  ) {
    const result = await this.couponService.issueCoupons(req.ctx, id, body.user_ids);

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }
}
