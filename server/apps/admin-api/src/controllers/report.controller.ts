// apps/admin-api/src/controllers/report.controller.ts

import { Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { ReportService } from '@app/modules/report';

@ApiTags('reports')
@Controller('api/admin/v1/reports')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '获取看板数据' })
  @ApiResponse({ status: 200, description: '成功' })
  async getDashboard(
    @Request() req: any,
    @Query('range') range?: string,
  ) {
    const dashboard = await this.reportService.getDashboard(req.ctx, range);

    return {
      code: 0,
      msg: 'ok',
      data: dashboard,
    };
  }

  @Get('sales')
  @ApiOperation({ summary: '获取销售报表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getSalesReport(
    @Request() req: any,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('group_by') groupBy?: string,
  ) {
    const report = await this.reportService.getSalesReport(req.ctx, {
      startDate,
      endDate,
      groupBy,
    });

    return {
      code: 0,
      msg: 'ok',
      data: report,
    };
  }

  @Get('members')
  @ApiOperation({ summary: '获取会员报表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getMemberReport(
    @Request() req: any,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const report = await this.reportService.getMemberReport(req.ctx, {
      startDate,
      endDate,
    });

    return {
      code: 0,
      msg: 'ok',
      data: report,
    };
  }

  @Get('activities')
  @ApiOperation({ summary: '获取活动报表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getActivityReport(
    @Request() req: any,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const report = await this.reportService.getActivityReport(req.ctx, {
      startDate,
      endDate,
    });

    return {
      code: 0,
      msg: 'ok',
      data: report,
    };
  }

  @Post('export')
  @ApiOperation({ summary: '导出报表' })
  @ApiResponse({ status: 200, description: '成功' })
  async exportReport(
    @Request() req: any,
    @Query('type') type: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const result = await this.reportService.exportReport(req.ctx, type, {
      startDate,
      endDate,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }
}
