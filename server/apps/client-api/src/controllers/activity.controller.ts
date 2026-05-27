// apps/client-api/src/controllers/activity.controller.ts

import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { ActivityService } from '@app/modules/activity';

@ApiTags('activities')
@Controller('api/client/v1/activities')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: '获取活动列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getActivities(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('venue_id') venueId?: number,
    @Query('date') date?: string,
  ) {
    const result = await this.activityService.getActivities(req.ctx, {
      page: page || 1,
      pageSize: limit || 20,
      type,
      status,
      venueId,
      date,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取活动详情' })
  @ApiResponse({ status: 200, description: '成功' })
  async getActivity(@Request() req: any, @Param('id') id: number) {
    const activity = await this.activityService.getActivityById(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: activity,
    };
  }

  @Get(':id/seats')
  @ApiOperation({ summary: '获取活动席位信息' })
  @ApiResponse({ status: 200, description: '成功' })
  async getSeats(@Param('id') id: number) {
    const seats = await this.activityService.getSeats(id);

    return {
      code: 0,
      msg: 'ok',
      data: seats,
    };
  }

  @Post(':id/registrations')
  @ApiOperation({ summary: '报名活动' })
  @ApiResponse({ status: 200, description: '成功' })
  async register(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: {
      extra_count?: number;
      participants?: Array<{ display_name: string; phone?: string }>;
      pay_method: string;
      card_id?: number;
      coupon_code?: string;
      share_token?: string;
    },
  ) {
    const idempotencyKey = req.headers['idempotency-key'] || `${id}-${req.ctx.userId}-${Date.now()}`;

    const result = await this.activityService.register(req.ctx, id, {
      extraCount: body.extra_count || 0,
      participants: body.participants?.map((p) => ({
        displayName: p.display_name,
        phone: p.phone,
      })),
      payMethod: body.pay_method,
      cardId: body.card_id,
      couponCode: body.coupon_code,
      shareToken: body.share_token,
      idempotencyKey,
    });

    return {
      code: 0,
      msg: 'ok',
      data: {
        registration_id: (result as any).registrationId || (result as any).id,
        seat_no: (result as any).seatNo || 0,
        is_waitlist: (result as any).isWaitlist || false,
        pay_status: (result as any).payStatus || (result as any).status,
      },
    };
  }

  @Delete(':id/registrations/:regId')
  @ApiOperation({ summary: '取消报名' })
  @ApiResponse({ status: 200, description: '成功' })
  async cancelRegistration(
    @Request() req: any,
    @Param('id') id: number,
    @Param('regId') regId: number,
  ) {
    const result = await this.activityService.cancelRegistration(req.ctx, id, regId);

    return {
      code: 0,
      msg: 'ok',
      data: {
        refund_amount: result.refundAmount,
        refund_channel: result.refundChannel,
      },
    };
  }

  @Post(':id/check-in')
  @ApiOperation({ summary: '签到' })
  @ApiResponse({ status: 200, description: '成功' })
  async checkIn(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: { registration_id: number },
  ) {
    const result = await this.activityService.checkIn(req.ctx, id, body.registration_id);

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }
}
