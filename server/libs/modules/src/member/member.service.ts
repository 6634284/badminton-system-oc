// libs/modules/src/member/member.service.ts

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';

@Injectable()
export class MemberService {
  constructor(private prisma: PrismaService) {}

  async getMemberById(ctx: RequestContext, memberId: number) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!member) {
      throw new NotFoundException('会员不存在');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: member.userId },
    });

    return { ...member, user };
  }

  async getMemberByUserId(ctx: RequestContext, userId: number) {
    const member = await this.prisma.member.findFirst({
      where: {
        userId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    return member;
  }

  async getMembers(ctx: RequestContext, params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    level?: number;
    blacklisted?: boolean;
  }) {
    const { page = 1, pageSize = 20, keyword, level, blacklisted } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: ctx.tenantId,
      deletedAt: null,
    };

    if (keyword) {
      where.OR = [
        { user: { nickname: { contains: keyword, mode: 'insensitive' } } },
        { user: { phone: { contains: keyword } } },
        { memberNo: { contains: keyword } },
      ];
    }

    if (level !== undefined) {
      where.level = level;
    }

    if (blacklisted !== undefined) {
      where.blacklisted = blacklisted;
    }

    const [items, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.member.count({ where }),
    ]);

    const members = [];
    for (const item of items) {
      const user = await this.prisma.user.findUnique({
        where: { id: item.userId },
      });
      members.push({ ...item, user });
    }

    return {
      list: members,
      total,
      hasMore: skip + members.length < total,
    };
  }

  async createMember(ctx: RequestContext, data: {
    userId: number;
    source?: string;
    referrerId?: number;
    tags?: string[];
    note?: string;
  }) {
    // 检查是否已存在
    const existing = await this.prisma.member.findFirst({
      where: {
        tenantId: ctx.tenantId,
        userId: data.userId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('该用户已是会员');
    }

    // 生成会员编号
    const count = await this.prisma.member.count({
      where: { tenantId: ctx.tenantId },
    });
    const memberNo = `M${String(count + 1).padStart(6, '0')}`;

    const member = await this.prisma.member.create({
      data: {
        tenantId: ctx.tenantId,
        userId: data.userId,
        memberNo,
        source: data.source,
        referrerId: data.referrerId,
        tags: data.tags || [],
        note: data.note,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    return { ...member, user };
  }

  async updateMember(ctx: RequestContext, memberId: number, data: {
    level?: number;
    tags?: string[];
    note?: string;
    blacklisted?: boolean;
  }) {
    const member = await this.getMemberById(ctx, memberId);

    return this.prisma.member.update({
      where: { id: memberId },
      data,
    });
  }

  async importMembers(ctx: RequestContext, members: Array<{
    phone: string;
    nickname?: string;
    level?: number;
    tags?: string[];
    note?: string;
  }>) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < members.length; i++) {
      try {
        const { phone, nickname, level, tags, note } = members[i];

        let user = await this.prisma.user.findFirst({
          where: { phoneHash: phone },
        });

        if (!user) {
          user = await this.prisma.user.create({
            data: {
              phone,
              phoneHash: phone,
              nickname: nickname || `用户${phone.slice(-4)}`,
            },
          });
        }

        await this.createMember(ctx, {
          userId: Number(user.id),
          tags,
          note,
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error.message || '未知错误',
        });
      }
    }

    return results;
  }

  async blacklistMember(ctx: RequestContext, memberId: number) {
    return this.updateMember(ctx, memberId, { blacklisted: true });
  }

  async unblacklistMember(ctx: RequestContext, memberId: number) {
    return this.updateMember(ctx, memberId, { blacklisted: false });
  }
}
