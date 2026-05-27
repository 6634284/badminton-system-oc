// apps/client-api/src/controllers/notification.controller.ts

import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { NotificationService } from '@app/modules/notification';

@ApiTags('notifications')
@Controller('api/client/v1/notifications')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '获取通知列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getNotifications(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('is_read') isRead?: boolean,
  ) {
    const result = await this.notificationService.getNotifications(req.ctx, {
      page,
      limit,
      isRead,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数' })
  @ApiResponse({ status: 200, description: '成功' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationService.getUnreadCount(req.ctx);

    return {
      code: 0,
      msg: 'ok',
      data: { count },
    };
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记通知已读' })
  @ApiResponse({ status: 200, description: '成功' })
  async markAsRead(@Request() req: any, @Param('id') id: number) {
    await this.notificationService.markAsRead(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: null,
    };
  }

  @Post('read-all')
  @ApiOperation({ summary: '标记所有通知已读' })
  @ApiResponse({ status: 200, description: '成功' })
  async markAllAsRead(@Request() req: any) {
    await this.notificationService.markAllAsRead(req.ctx);

    return {
      code: 0,
      msg: 'ok',
      data: null,
    };
  }
}
