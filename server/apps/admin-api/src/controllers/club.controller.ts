// apps/admin-api/src/controllers/club.controller.ts

import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { TenantService } from '@app/modules/tenant';

@ApiTags('club')
@Controller('api/admin/v1/club')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class ClubController {
  constructor(private tenantService: TenantService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取俱乐部信息' })
  @ApiResponse({ status: 200, description: '成功' })
  async getProfile(@Request() req: any) {
    const tenant = await this.tenantService.getTenantById(req.ctx.tenantId);

    return {
      code: 0,
      msg: 'ok',
      data: tenant,
    };
  }

  @Patch('profile')
  @ApiOperation({ summary: '更新俱乐部信息' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateProfile(@Request() req: any, @Body() body: any) {
    const result = await this.tenantService.updateTenant(req.ctx, req.ctx.tenantId, body);

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }
}
