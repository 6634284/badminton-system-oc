// apps/client-api/src/controllers/user.controller.ts

import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { MemberService } from '@app/modules/member';

@ApiTags('users')
@Controller('api/client/v1/users')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private memberService: MemberService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '成功' })
  async getMe(@Request() req: any) {
    const member = await this.memberService.getMemberByUserId(
      req.ctx,
      req.ctx.userId,
    );

    return {
      code: 0,
      msg: 'ok',
      data: {
        user_id: req.ctx.userId,
        tenant_id: req.ctx.tenantId,
        member: member,
      },
    };
  }

  @Patch('me')
  @ApiOperation({ summary: '修改当前用户信息' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateMe(@Request() req: any, @Body() body: { nickname?: string; avatar_url?: string }) {
    // 简化处理
    return {
      code: 0,
      msg: 'ok',
      data: null,
    };
  }
}
