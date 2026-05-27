// apps/admin-api/src/controllers/platform.controller.ts

import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantService } from '@app/modules/tenant';
import { ReportService } from '@app/modules/report';

@ApiTags('platform')
@Controller('api/admin/v1/platform')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlatformController {
  constructor(
    private tenantService: TenantService,
    private reportService: ReportService,
  ) {}

  @Get('tenants')
  @ApiOperation({ summary: '获取入驻列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getTenants(
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

  @Post('tenants/:id/approve')
  @ApiOperation({ summary: '审核通过' })
  @ApiResponse({ status: 200, description: '成功' })
  async approveTenant(@Request() req: any, @Param('id') id: number) {
    const result = await this.tenantService.approveTenant(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Post('tenants/:id/reject')
  @ApiOperation({ summary: '审核拒绝' })
  @ApiResponse({ status: 200, description: '成功' })
  async rejectTenant(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: { reason: string },
  ) {
    const result = await this.tenantService.rejectTenant(req.ctx, id, body.reason);

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Get('dashboard')
  @ApiOperation({ summary: '平台看板' })
  @ApiResponse({ status: 200, description: '成功' })
  async getDashboard(@Request() req: any) {
    const dashboard = await this.reportService.getDashboard(req.ctx, 'today');

    return {
      code: 0,
      msg: 'ok',
      data: dashboard,
    };
  }
}
