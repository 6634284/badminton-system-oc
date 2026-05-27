// libs/modules/src/activity/activity.service.ts

import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';
import { QueueService } from '@app/infra/queue';
import { RequestContext } from '@app/shared/context';
import { AuditService } from '@app/shared/audit';
import { OutOfSeatsError, AlreadyRegisteredError, InsufficientBalanceError } from '@app/shared/errors';
import { CreateActivityDto, UpdateActivityDto, RegisterActivityDto } from './dto';

@Injectable()
export class ActivityService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private queueService: QueueService,
    private auditService: AuditService,
  ) {}

  async getActivityById(ctx: RequestContext, activityId: number) {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id: activityId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    const venue = await this.prisma.venue.findUnique({
      where: { id: activity.venueId },
    });

    const courts = await this.prisma.activityCourt.findMany({
      where: { activityId },
    });

    const registrationCount = await this.prisma.activityRegistration.count({
      where: {
        activityId,
        status: 'confirmed',
      },
    });

    return {
      ...activity,
      venue,
      courts,
      _count: { registrations: registrationCount },
    };
  }

  async getActivities(ctx: RequestContext, params: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
    venueId?: number;
    date?: string;
  }) {
    const { page = 1, pageSize = 20, type, status, venueId, date } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: ctx.tenantId,
      deletedAt: null,
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (venueId) where.venueId = venueId;
    if (date) where.playDate = new Date(date);

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { playDate: 'asc' },
      }),
      this.prisma.activity.count({ where }),
    ]);

    const activities = [];
    for (const item of items) {
      const venue = await this.prisma.venue.findUnique({
        where: { id: item.venueId },
      });

      const registrationCount = await this.prisma.activityRegistration.count({
        where: {
          activityId: item.id,
          status: 'confirmed',
        },
      });

      activities.push({
        ...item,
        venue,
        _count: { registrations: registrationCount },
      });
    }

    return {
      list: activities,
      total,
      hasMore: skip + activities.length < total,
    };
  }

  async createActivity(ctx: RequestContext, data: CreateActivityDto) {
    const activity = await this.prisma.activity.create({
      data: {
        tenantId: ctx.tenantId,
        type: data.type,
        venueId: data.venueId,
        title: data.title,
        coverUrl: data.coverUrl,
        playDate: new Date(data.playDate),
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        capacity: data.capacity,
        price: data.price,
        memberPrice: data.memberPrice,
        cancelPolicy: data.cancelPolicy || {
          before_24h: 1.0,
          before_2h: 0.5,
          within_2h: 0,
        },
        status: 'draft',
        registerOpenAt: data.registerOpenAt ? new Date(data.registerOpenAt) : null,
        registerCloseAt: data.registerCloseAt ? new Date(data.registerCloseAt) : null,
        createdBy: ctx.userId,
      },
    });

    if (data.scheduleIds && data.scheduleIds.length > 0) {
      await this.prisma.activityCourt.createMany({
        data: data.scheduleIds.map((scheduleId) => ({
          activityId: activity.id,
          scheduleId,
        })),
      });

      await this.prisma.courtSchedule.updateMany({
        where: { id: { in: data.scheduleIds } },
        data: { status: 'held', refType: 'activity', refId: activity.id },
      });
    }

    await this.redis.set(`activity:${activity.id}:left`, String(data.capacity));
    await this.redis.set(`activity:${activity.id}:seats:version`, '0');

    await this.auditService.log(ctx, {
      category: 'activity',
      action: 'create',
      targetType: 'activity',
      targetId: String(activity.id),
    });

    return activity;
  }

  async publishActivity(ctx: RequestContext, activityId: number) {
    const activity = await this.getActivityById(ctx, activityId);

    if (activity.status !== 'draft') {
      throw new ForbiddenException('只有草稿状态的活动可以发布');
    }

    const updated = await this.prisma.activity.update({
      where: { id: activityId },
      data: { status: 'published' },
    });

    await this.auditService.log(ctx, {
      category: 'activity',
      action: 'publish',
      targetType: 'activity',
      targetId: String(activityId),
    });

    return updated;
  }

  async cancelActivity(ctx: RequestContext, activityId: number, reason: string) {
    const activity = await this.getActivityById(ctx, activityId);

    if (['finished', 'settled', 'canceled'].includes(activity.status)) {
      throw new ForbiddenException('该状态的活动无法取消');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.activity.update({
        where: { id: activityId },
        data: { status: 'canceled' },
      });

      await tx.activityRegistration.updateMany({
        where: {
          activityId,
          status: { in: ['paying', 'confirmed'] },
        },
        data: { status: 'canceled', canceledAt: new Date() },
      });

      await tx.courtSchedule.updateMany({
        where: {
          refType: 'activity',
          refId: activityId,
        },
        data: { status: 'available', refType: null, refId: null },
      });

      return updated;
    });

    await this.queueService.addJob('refund', 'activity-cancel', {
      activityId,
      reason,
    });

    await this.auditService.log(ctx, {
      category: 'activity',
      action: 'cancel',
      targetType: 'activity',
      targetId: String(activityId),
      payload: { reason },
    });

    return updated;
  }

  async register(ctx: RequestContext, activityId: number, data: RegisterActivityDto & { idempotencyKey: string }) {
    const activity = await this.getActivityById(ctx, activityId);

    if (activity.status !== 'registering' && activity.status !== 'published') {
      throw new ForbiddenException('活动当前不允许报名');
    }

    const existing = await this.prisma.activityRegistration.findFirst({
      where: {
        activityId,
        userId: ctx.userId,
        activeUserKey: { not: null },
        deletedAt: null,
      },
    });

    if (existing) {
      throw new AlreadyRegisteredError();
    }

    const idempotencyResult = await this.prisma.activityRegistration.findFirst({
      where: { idempotencyKey: data.idempotencyKey },
    });

    if (idempotencyResult) {
      return idempotencyResult;
    }

    const totalSlots = 1 + (data.extraCount || 0);

    const grabResult = await this.grabSeat(activityId, ctx.userId, totalSlots);
    if (grabResult === -1) {
      throw new OutOfSeatsError();
    }
    if (grabResult === -3) {
      throw new AlreadyRegisteredError();
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const unitPrice = activity.memberPrice || activity.price;
        const payAmount = Number(unitPrice) * totalSlots;

        const registration = await tx.activityRegistration.create({
          data: {
            tenantId: ctx.tenantId,
            activityId,
            userId: ctx.userId,
            memberId: 0,
            isWaitlist: false,
            extraCount: data.extraCount || 0,
            totalSlots,
            payAmount,
            payMethod: data.payMethod,
            status: data.payMethod === 'wallet' ? 'confirmed' : 'paying',
            idempotencyKey: data.idempotencyKey,
            activeUserKey: `${activityId}:${ctx.userId}`,
            shareToken: data.shareToken,
          },
        });

        await tx.registrationParticipant.create({
          data: {
            tenantId: ctx.tenantId,
            activityId,
            registrationId: registration.id,
            userId: ctx.userId,
            seatNo: grabResult,
            status: 'confirmed',
          },
        });

        if (data.participants && data.participants.length > 0) {
          await tx.registrationParticipant.createMany({
            data: data.participants.map((p, index) => ({
              tenantId: ctx.tenantId,
              activityId,
              registrationId: registration.id,
              displayName: p.displayName,
              phoneHash: p.phone,
              seatNo: grabResult + index + 1,
              status: 'confirmed',
            })),
          });
        }

        await tx.activity.update({
          where: { id: activityId },
          data: {
            joinCount: { increment: totalSlots },
          },
        });

        if (data.shareToken) {
          await tx.activityShareToken.updateMany({
            where: { token: data.shareToken },
            data: { registerCount: { increment: 1 } },
          });
        }

        return registration;
      });

      await this.auditService.log(ctx, {
        category: 'activity',
        action: 'register',
        targetType: 'activity_registration',
        targetId: String(result.id),
        payload: { activityId, payMethod: data.payMethod },
      });

      return {
        registrationId: result.id,
        seatNo: grabResult,
        isWaitlist: false,
        payStatus: result.status,
      };
    } catch (error) {
      await this.releaseSeat(activityId, ctx.userId, totalSlots);
      throw error;
    }
  }

  async cancelRegistration(ctx: RequestContext, activityId: number, registrationId: number) {
    const registration = await this.prisma.activityRegistration.findFirst({
      where: {
        id: registrationId,
        activityId,
        userId: ctx.userId,
        status: { in: ['paying', 'confirmed'] },
      },
    });

    if (!registration) {
      throw new NotFoundException('报名记录不存在');
    }

    const activity = await this.getActivityById(ctx, activityId);

    const cancelPolicy = activity.cancelPolicy as any;
    const now = new Date();
    const startAt = new Date(activity.startAt);
    const hoursUntilStart = (startAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundRate = 0;
    if (hoursUntilStart >= 24) {
      refundRate = cancelPolicy.before_24h || 1;
    } else if (hoursUntilStart >= 2) {
      refundRate = cancelPolicy.before_2h || 0.5;
    } else {
      refundRate = cancelPolicy.within_2h || 0;
    }

    const refundAmount = Number(registration.payAmount) * refundRate;

    await this.prisma.$transaction(async (tx) => {
      await tx.activityRegistration.update({
        where: { id: registrationId },
        data: { status: 'canceled', canceledAt: new Date() },
      });

      await tx.registrationParticipant.updateMany({
        where: { registrationId },
        data: { status: 'canceled', canceledAt: new Date() },
      });

      await tx.activity.update({
        where: { id: activityId },
        data: {
          joinCount: { decrement: registration.totalSlots },
        },
      });
    });

    await this.releaseSeat(activityId, ctx.userId, registration.totalSlots);

    if (refundAmount > 0) {
      await this.queueService.addJob('refund', 'registration-cancel', {
        registrationId,
        refundAmount,
      });
    }

    await this.auditService.log(ctx, {
      category: 'activity',
      action: 'cancel_registration',
      targetType: 'activity_registration',
      targetId: String(registrationId),
      payload: { activityId, refundAmount },
    });

    return {
      refundAmount,
      refundChannel: registration.payMethod,
    };
  }

  async checkIn(ctx: RequestContext, activityId: number, registrationId: number) {
    const registration = await this.prisma.activityRegistration.findFirst({
      where: {
        id: registrationId,
        activityId,
        status: 'confirmed',
      },
    });

    if (!registration) {
      throw new NotFoundException('报名记录不存在');
    }

    await this.prisma.registrationParticipant.updateMany({
      where: { registrationId },
      data: { status: 'attended', checkedInAt: new Date() },
    });

    await this.prisma.activityRegistration.update({
      where: { id: registrationId },
      data: { status: 'attended' },
    });

    await this.auditService.log(ctx, {
      category: 'activity',
      action: 'check_in',
      targetType: 'activity_registration',
      targetId: String(registrationId),
    });

    return { success: true };
  }

  async markNoShow(ctx: RequestContext, activityId: number, registrationId: number) {
    const registration = await this.prisma.activityRegistration.findFirst({
      where: {
        id: registrationId,
        activityId,
        status: 'confirmed',
      },
    });

    if (!registration) {
      throw new NotFoundException('报名记录不存在');
    }

    await this.prisma.registrationParticipant.updateMany({
      where: { registrationId },
      data: { status: 'no_show' },
    });

    await this.prisma.activityRegistration.update({
      where: { id: registrationId },
      data: { status: 'no_show' },
    });

    await this.auditService.log(ctx, {
      category: 'activity',
      action: 'mark_no_show',
      targetType: 'activity_registration',
      targetId: String(registrationId),
    });

    return { success: true };
  }

  async getSeats(activityId: number) {
    const left = await this.redis.get(`activity:${activityId}:left`);
    const version = await this.redis.get(`activity:${activityId}:seats:version`);

    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        joinCount: true,
        waitlistCount: true,
        capacity: true,
      },
    });

    return {
      version: parseInt(version || '0'),
      joinCount: activity?.joinCount || 0,
      left: parseInt(left || '0'),
      waitlistCount: activity?.waitlistCount || 0,
    };
  }

  private async grabSeat(activityId: number, userId: number, count: number): Promise<number> {
    const script = `
      local left_key = KEYS[1]
      local set_key = KEYS[2]
      local user_id = ARGV[1]
      local need = tonumber(ARGV[2])

      if redis.call('SISMEMBER', set_key, user_id) == 1 then
        return {-3}
      end

      local left = tonumber(redis.call('GET', left_key) or '0')
      if left < need then
        return {-1}
      end

      redis.call('DECRBY', left_key, need)
      redis.call('SADD', set_key, user_id)
      return {0, left - need}
    `;

    const result = await this.redis.eval(
      script,
      [`activity:${activityId}:left`, `activity:${activityId}:participants`],
      [String(userId), String(count)],
    );

    if (result[0] === 0) {
      return result[1] as number; // 返回剩余席位
    }
    return result[0] as number; // 返回错误码
  }

  private async releaseSeat(activityId: number, userId: number, count: number): Promise<void> {
    const script = `
      local left_key = KEYS[1]
      local set_key = KEYS[2]
      local user_id = ARGV[1]
      local count = tonumber(ARGV[2])

      redis.call('INCRBY', left_key, count)
      redis.call('SREM', set_key, user_id)
      return 1
    `;

    await this.redis.eval(
      script,
      [`activity:${activityId}:left`, `activity:${activityId}:participants`],
      [String(userId), String(count)],
    );
  }
}
