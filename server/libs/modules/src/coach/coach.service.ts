// libs/modules/src/coach/coach.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';
import { AuditService } from '@app/shared/audit';

export interface CoachData {
  userId: number;
  name: string;
  avatarUrl?: string;
  intro?: string;
  level?: string;
  pricePerHour: number;
}

export interface CourseData {
  title: string;
  type: '1v1' | '1v4' | 'group';
  durationMinutes: number;
  price: number;
}

@Injectable()
export class CoachService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getCoaches(ctx: RequestContext, params: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: ctx.tenantId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.coach.findMany({
        where,
        include: {
          lessons: {
            where: { deletedAt: null, status: 'active' },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coach.count({ where }),
    ]);

    return {
      list: items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async getCoachById(ctx: RequestContext, coachId: number) {
    const coach = await this.prisma.coach.findFirst({
      where: {
        id: coachId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
      include: {
        lessons: {
          where: { deletedAt: null },
        },
        user: true,
      },
    });

    if (!coach) {
      throw new NotFoundException('教练不存在');
    }

    return coach;
  }

  async createCoach(ctx: RequestContext, data: CoachData) {
    const existing = await this.prisma.coach.findFirst({
      where: {
        tenantId: ctx.tenantId,
        userId: data.userId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException('该用户已是教练');
    }

    const coach = await this.prisma.coach.create({
      data: {
        tenantId: ctx.tenantId,
        userId: data.userId,
        name: data.name,
        avatarUrl: data.avatarUrl,
        intro: data.intro,
        level: data.level,
        pricePerHour: data.pricePerHour,
        status: 'active',
      },
    });

    await this.auditService.log(ctx, {
      category: 'coach',
      action: 'create',
      targetType: 'coach',
      targetId: String(coach.id),
    });

    return coach;
  }

  async updateCoach(ctx: RequestContext, coachId: number, data: Partial<CoachData>) {
    const coach = await this.getCoachById(ctx, coachId);

    return this.prisma.coach.update({
      where: { id: coachId },
      data: {
        name: data.name || coach.name,
        avatarUrl: data.avatarUrl || coach.avatarUrl,
        intro: data.intro || coach.intro,
        level: data.level || coach.level,
        pricePerHour: data.pricePerHour || coach.pricePerHour,
      },
    });
  }

  async deleteCoach(ctx: RequestContext, coachId: number) {
    await this.getCoachById(ctx, coachId);

    await this.prisma.coach.update({
      where: { id: coachId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async createCourse(ctx: RequestContext, coachId: number, data: CourseData) {
    await this.getCoachById(ctx, coachId);

    const course = await this.prisma.coachLesson.create({
      data: {
        tenantId: ctx.tenantId,
        coachId,
        title: data.title,
        type: data.type,
        durationMinutes: data.durationMinutes,
        price: data.price,
        status: 'active',
      },
    });

    return course;
  }

  async getCourses(ctx: RequestContext, coachId: number) {
    return this.prisma.coachLesson.findMany({
      where: {
        coachId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCourse(ctx: RequestContext, courseId: number, data: Partial<CourseData>) {
    const course = await this.prisma.coachLesson.findFirst({
      where: {
        id: courseId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    return this.prisma.coachLesson.update({
      where: { id: courseId },
      data: {
        title: data.title || course.title,
        type: data.type || course.type,
        durationMinutes: data.durationMinutes || course.durationMinutes,
        price: data.price || course.price,
      },
    });
  }

  async deleteCourse(ctx: RequestContext, courseId: number) {
    const course = await this.prisma.coachLesson.findFirst({
      where: {
        id: courseId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    await this.prisma.coachLesson.update({
      where: { id: courseId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async getCoachSchedule(ctx: RequestContext, coachId: number, startDate: string, endDate: string) {
    await this.getCoachById(ctx, coachId);

    // 查询教练关联的活动作为课程安排
    const activities = await this.prisma.activity.findMany({
      where: {
        tenantId: ctx.tenantId,
        coachId,
        playDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        deletedAt: null,
      },
      include: {
        venue: true,
      },
      orderBy: { playDate: 'asc' },
    });

    return activities;
  }

  async getCoachStats(ctx: RequestContext, coachId: number) {
    const coach = await this.getCoachById(ctx, coachId);

    const [totalLessons, totalStudents] = await Promise.all([
      this.prisma.activity.count({
        where: {
          tenantId: ctx.tenantId,
          coachId,
          status: 'finished',
          deletedAt: null,
        },
      }),
      this.prisma.activityRegistration.findMany({
        where: {
          tenantId: ctx.tenantId,
          activity: { coachId },
          status: 'attended',
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    return {
      coachId: Number(coach.id),
      name: coach.name,
      totalLessons,
      totalStudents: totalStudents.length,
      pricePerHour: coach.pricePerHour,
    };
  }
}
