// apps/admin-api/src/controllers/activity.controller.ts

import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { ActivityService } from '@app/modules/activity';

@ApiTags('activities')
@Controller('api/admin/v1/activities')
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

  @Post()
  @ApiOperation({ summary: '创建活动' })
  @ApiResponse({ status: 200, description: '成功' })
  async createActivity(
    @Request() req: any,
    @Body() body: {
      type: string;
      venue_id: number;
      title: string;
      cover_url?: string;
      play_date: string;
      start_at: string;
      end_at: string;
      capacity: number;
      price: number;
      member_price?: number;
      cancel_policy?: any;
      register_open_at?: string;
      register_close_at?: string;
      schedule_ids?: number[];
    },
  ) {
    const activity = await this.activityService.createActivity(req.ctx, {
      type: body.type,
      venueId: body.venue_id,
      title: body.title,
      coverUrl: body.cover_url,
      playDate: body.play_date,
      startAt: body.start_at,
      endAt: body.end_at,
      capacity: body.capacity,
      price: body.price,
      memberPrice: body.member_price,
      cancelPolicy: body.cancel_policy,
      registerOpenAt: body.register_open_at,
      registerCloseAt: body.register_close_at,
      scheduleIds: body.schedule_ids,
    });

    return {
      code: 0,
      msg: 'ok',
      data: activity,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新活动' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateActivity(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: any,
  ) {
    // 简化处理
    return {
      code: 0,
      msg: 'ok',
      data: null,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除活动' })
  @ApiResponse({ status: 200, description: '成功' })
  async deleteActivity(@Request() req: any, @Param('id') id: number) {
    // 简化处理
    return {
      code: 0,
      msg: 'ok',
      data: null,
    };
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '发布活动' })
  @ApiResponse({ status: 200, description: '成功' })
  async publishActivity(@Request() req: any, @Param('id') id: number) {
    const result = await this.activityService.publishActivity(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消活动' })
  @ApiResponse({ status: 200, description: '成功' })
  async cancelActivity(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: { reason: string },
  ) {
    const result = await this.activityService.cancelActivity(req.ctx, id, body.reason);

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Get(':id/registrations')
  @ApiOperation({ summary: '获取报名列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getRegistrations(
    @Request() req: any,
    @Param('id') id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    // 简化处理
    return {
      code: 0,
      msg: 'ok',
      data: { list: [], total: 0, has_more: false },
    };
  }

  @Post(':id/check-in/:regId')
  @ApiOperation({ summary: '签到' })
  @ApiResponse({ status: 200, description: '成功' })
  async checkIn(
    @Request() req: any,
    @Param('id') id: number,
    @Param('regId') regId: number,
  ) {
    const result = await this.activityService.checkIn(req.ctx, id, regId);

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Post(':id/no-show/:regId')
  @ApiOperation({ summary: '标记爽约' })
  @ApiResponse({ status: 200, description: '成功' })
  async markNoShow(
    @Request() req: any,
    @Param('id') id: number,
    @Param('regId') regId: number,
  ) {
    const result = await this.activityService.markNoShow(req.ctx, id, regId);

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }
}
