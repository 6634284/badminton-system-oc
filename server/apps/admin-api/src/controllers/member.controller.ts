// apps/admin-api/src/controllers/member.controller.ts

import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { MemberService } from '@app/modules/member';

@ApiTags('members')
@Controller('api/admin/v1/members')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class MemberController {
  constructor(private memberService: MemberService) {}

  @Get()
  @ApiOperation({ summary: '获取会员列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getMembers(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('keyword') keyword?: string,
    @Query('level') level?: number,
    @Query('blacklisted') blacklisted?: boolean,
  ) {
    const result = await this.memberService.getMembers(req.ctx, {
      page: page || 1,
      pageSize: limit || 20,
      keyword,
      level: level || undefined,
      blacklisted,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取会员详情' })
  @ApiResponse({ status: 200, description: '成功' })
  async getMember(@Request() req: any, @Param('id') id: number) {
    const member = await this.memberService.getMemberById(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: member,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新会员' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateMember(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: { level?: number; tags?: string[]; note?: string },
  ) {
    const member = await this.memberService.updateMember(req.ctx, id, body);

    return {
      code: 0,
      msg: 'ok',
      data: member,
    };
  }

  @Post(':id/blacklist')
  @ApiOperation({ summary: '拉黑会员' })
  @ApiResponse({ status: 200, description: '成功' })
  async blacklistMember(@Request() req: any, @Param('id') id: number) {
    const member = await this.memberService.blacklistMember(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: member,
    };
  }

  @Post('import')
  @ApiOperation({ summary: '导入会员' })
  @ApiResponse({ status: 200, description: '成功' })
  async importMembers(
    @Request() req: any,
    @Body() body: { members: Array<{ phone: string; nickname?: string; level?: number }> },
  ) {
    const result = await this.memberService.importMembers(req.ctx, body.members);

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }
}
