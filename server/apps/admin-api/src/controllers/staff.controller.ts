// apps/admin-api/src/controllers/staff.controller.ts

import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { PrismaService } from '@app/infra/prisma';

@ApiTags('staffs')
@Controller('api/admin/v1/staffs')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '获取员工列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getStaffs(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const skip = ((page || 1) - 1) * (limit || 20);

    const [items, total] = await Promise.all([
      this.prisma.tenantStaff.findMany({
        where: {
          tenantId: req.ctx.tenantId,
          deletedAt: null,
        },
        skip,
        take: limit || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenantStaff.count({
        where: {
          tenantId: req.ctx.tenantId,
          deletedAt: null,
        },
      }),
    ]);

    const staffs = [];
    for (const item of items) {
      const user = await this.prisma.user.findUnique({
        where: { id: item.userId },
      });
      const role = await this.prisma.role.findUnique({
        where: { id: item.roleId },
      });
      staffs.push({ ...item, user, role });
    }

    return {
      code: 0,
      msg: 'ok',
      data: {
        list: staffs,
        total,
        has_more: skip + staffs.length < total,
      },
    };
  }

  @Post()
  @ApiOperation({ summary: '添加员工' })
  @ApiResponse({ status: 200, description: '成功' })
  async createStaff(
    @Request() req: any,
    @Body() body: { user_id: number; role_id: number },
  ) {
    const staff = await this.prisma.tenantStaff.create({
      data: {
        tenantId: req.ctx.tenantId,
        userId: body.user_id,
        roleId: body.role_id,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: body.user_id },
    });
    const role = await this.prisma.role.findUnique({
      where: { id: body.role_id },
    });

    return {
      code: 0,
      msg: 'ok',
      data: { ...staff, user, role },
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新员工' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateStaff(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: { role_id?: number; status?: string },
  ) {
    const staff = await this.prisma.tenantStaff.update({
      where: { id },
      data: body,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: staff.userId },
    });
    const role = await this.prisma.role.findUnique({
      where: { id: staff.roleId },
    });

    return {
      code: 0,
      msg: 'ok',
      data: { ...staff, user, role },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除员工' })
  @ApiResponse({ status: 200, description: '成功' })
  async deleteStaff(@Request() req: any, @Param('id') id: number) {
    await this.prisma.tenantStaff.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      code: 0,
      msg: 'ok',
      data: null,
    };
  }

  @Get('roles')
  @ApiOperation({ summary: '获取角色列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getRoles(@Request() req: any) {
    const roles = await this.prisma.role.findMany({
      where: {
        tenantId: req.ctx.tenantId,
      },
    });

    return {
      code: 0,
      msg: 'ok',
      data: roles,
    };
  }
}
