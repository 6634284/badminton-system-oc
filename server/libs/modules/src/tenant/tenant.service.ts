// libs/modules/src/tenant/tenant.service.ts

import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';
import { AuditService } from '@app/shared/audit';
import { CreateTenantDto, UpdateTenantDto, SubscriptionDto } from './dto';

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getTenantById(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException('俱乐部不存在');
    }

    return tenant;
  }

  async getTenantsByUser(userId: number) {
    const staffs = await this.prisma.tenantStaff.findMany({
      where: { userId, status: 'active' },
    });

    const tenants = [];
    for (const staff of staffs) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: staff.tenantId },
      });
      if (tenant) {
        tenants.push(tenant);
      }
    }

    return tenants;
  }

  async getTenants(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
  }) {
    const { page = 1, pageSize = 20, status, keyword } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
        { contactName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      list: items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async createTenant(data: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException('俱乐部编码已存在');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        ...data,
        status: 'pending',
        plan: 'trial',
        planExpiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 创建默认角色
    await this.prisma.role.createMany({
      data: [
        { tenantId: tenant.id, code: 'owner', name: '主理人', isSystem: true },
        { tenantId: tenant.id, code: 'admin', name: '管理员', isSystem: true },
        { tenantId: tenant.id, code: 'staff', name: '员工', isSystem: true },
        { tenantId: tenant.id, code: 'coach', name: '教练', isSystem: true },
      ],
    });

    return tenant;
  }

  async approveTenant(ctx: RequestContext, tenantId: number, remark?: string) {
    const tenant = await this.getTenantById(tenantId);

    if (tenant.status !== 'pending') {
      throw new ForbiddenException('该俱乐部状态不允许审核');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'active' },
    });

    await this.auditService.log(ctx, {
      category: 'tenant',
      action: 'approve',
      targetType: 'tenant',
      targetId: String(tenantId),
      riskLevel: 2,
      payload: { remark },
    });

    return updated;
  }

  async rejectTenant(ctx: RequestContext, tenantId: number, reason: string) {
    const tenant = await this.getTenantById(tenantId);

    if (tenant.status !== 'pending') {
      throw new ForbiddenException('该俱乐部状态不允许审核');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'rejected' },
    });

    await this.auditService.log(ctx, {
      category: 'tenant',
      action: 'reject',
      targetType: 'tenant',
      targetId: String(tenantId),
      riskLevel: 2,
      payload: { reason },
    });

    return updated;
  }

  async suspendTenant(ctx: RequestContext, tenantId: number, reason: string) {
    const tenant = await this.getTenantById(tenantId);

    if (tenant.status !== 'active') {
      throw new ForbiddenException('只有已激活的俱乐部可以暂停');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'suspended' },
    });

    await this.auditService.log(ctx, {
      category: 'tenant',
      action: 'suspend',
      targetType: 'tenant',
      targetId: String(tenantId),
      riskLevel: 3,
      payload: { reason },
    });

    return updated;
  }

  async updateTenant(ctx: RequestContext, tenantId: number, data: UpdateTenantDto) {
    const tenant = await this.getTenantById(tenantId);

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    await this.auditService.log(ctx, {
      category: 'tenant',
      action: 'update',
      targetType: 'tenant',
      targetId: String(tenantId),
      beforeJson: tenant,
      afterJson: updated,
    });

    return updated;
  }

  async verifyTenantMember(userId: number, tenantId: number): Promise<boolean> {
    const staff = await this.prisma.tenantStaff.findFirst({
      where: {
        userId,
        tenantId,
        status: 'active',
      },
    });

    return !!staff;
  }

  async addStaff(ctx: RequestContext, tenantId: number, userId: number, roleId: number) {
    const existing = await this.prisma.tenantStaff.findFirst({
      where: {
        tenantId,
        userId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('该用户已是俱乐部员工');
    }

    const staff = await this.prisma.tenantStaff.create({
      data: {
        tenantId,
        userId,
        roleId,
      },
    });

    await this.auditService.log(ctx, {
      category: 'tenant',
      action: 'add_staff',
      targetType: 'tenant_staff',
      targetId: String(staff.id),
    });

    return staff;
  }

  async removeStaff(ctx: RequestContext, tenantId: number, staffId: number) {
    const staff = await this.prisma.tenantStaff.findFirst({
      where: {
        id: staffId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!staff) {
      throw new NotFoundException('员工不存在');
    }

    if (staff.isOwner) {
      throw new ForbiddenException('不能删除主理人');
    }

    await this.prisma.tenantStaff.update({
      where: { id: staffId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log(ctx, {
      category: 'tenant',
      action: 'remove_staff',
      targetType: 'tenant_staff',
      targetId: String(staffId),
    });

    return { success: true };
  }

  async getStaffs(tenantId: number, params: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = params;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.tenantStaff.findMany({
        where: {
          tenantId,
          deletedAt: null,
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenantStaff.count({
        where: {
          tenantId,
          deletedAt: null,
        },
      }),
    ]);

    return {
      list: items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async getRoles(tenantId: number) {
    return this.prisma.role.findMany({
      where: {
        tenantId,
      },
    });
  }

  async updateSubscription(ctx: RequestContext, tenantId: number, data: SubscriptionDto) {
    const tenant = await this.getTenantById(tenantId);

    let durationDays = 0;
    switch (data.plan) {
      case 'trial':
        durationDays = 30;
        break;
      case 'basic':
        durationDays = 365;
        break;
      case 'pro':
        durationDays = 365;
        break;
      case 'enterprise':
        durationDays = 365;
        break;
    }

    const planExpiredAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: data.plan,
        planExpiredAt,
      },
    });

    await this.auditService.log(ctx, {
      category: 'tenant',
      action: 'update_subscription',
      targetType: 'tenant',
      targetId: String(tenantId),
      payload: { plan: data.plan, autoRenew: data.autoRenew },
    });

    return updated;
  }
}
