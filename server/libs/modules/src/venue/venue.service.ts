// libs/modules/src/venue/venue.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';
import { AuditService } from '@app/shared/audit';
import { CreateVenueDto, UpdateVenueDto, CreateCourtDto, UpdateCourtDto, GenerateSchedulesDto, UpdateScheduleDto, BatchUpdateScheduleDto } from './dto';

@Injectable()
export class VenueService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getVenueById(ctx: RequestContext, venueId: number) {
    const venue = await this.prisma.venue.findFirst({
      where: {
        id: venueId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!venue) {
      throw new NotFoundException('球馆不存在');
    }

    const courts = await this.prisma.court.findMany({
      where: {
        venueId,
        tenantId: ctx.tenantId,
        deletedAt: null,
        status: 'active',
      },
    });

    return { ...venue, courts };
  }

  async getVenues(ctx: RequestContext, params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: string;
  }) {
    const { page = 1, pageSize = 20, keyword, status } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: ctx.tenantId,
      deletedAt: null,
    };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { address: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.venue.count({ where }),
    ]);

    const venues = [];
    for (const item of items) {
      const courts = await this.prisma.court.findMany({
        where: {
          venueId: item.id,
          tenantId: ctx.tenantId,
          deletedAt: null,
        },
      });
      venues.push({ ...item, courts });
    }

    return {
      list: venues,
      total,
      hasMore: skip + venues.length < total,
    };
  }

  async createVenue(ctx: RequestContext, data: CreateVenueDto) {
    const venue = await this.prisma.venue.create({
      data: {
        tenantId: ctx.tenantId,
        ...data,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
      },
    });

    await this.auditService.log(ctx, {
      category: 'venue',
      action: 'create',
      targetType: 'venue',
      targetId: String(venue.id),
    });

    return venue;
  }

  async updateVenue(ctx: RequestContext, venueId: number, data: UpdateVenueDto) {
    await this.getVenueById(ctx, venueId);

    const updated = await this.prisma.venue.update({
      where: { id: venueId },
      data,
    });

    await this.auditService.log(ctx, {
      category: 'venue',
      action: 'update',
      targetType: 'venue',
      targetId: String(venueId),
    });

    return updated;
  }

  async deleteVenue(ctx: RequestContext, venueId: number) {
    await this.getVenueById(ctx, venueId);

    await this.prisma.venue.update({
      where: { id: venueId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log(ctx, {
      category: 'venue',
      action: 'delete',
      targetType: 'venue',
      targetId: String(venueId),
    });

    return { success: true };
  }

  async getCourts(ctx: RequestContext, venueId: number) {
    return this.prisma.court.findMany({
      where: {
        venueId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
      orderBy: { code: 'asc' },
    });
  }

  async getCourtById(ctx: RequestContext, courtId: number) {
    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!court) {
      throw new NotFoundException('场地不存在');
    }

    const venue = await this.prisma.venue.findUnique({
      where: { id: court.venueId },
    });

    return { ...court, venue };
  }

  async createCourt(ctx: RequestContext, venueId: number, data: CreateCourtDto) {
    const existing = await this.prisma.court.findFirst({
      where: {
        venueId,
        code: data.code,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('场地编号已存在');
    }

    const court = await this.prisma.court.create({
      data: {
        tenantId: ctx.tenantId,
        venueId,
        ...data,
      },
    });

    await this.auditService.log(ctx, {
      category: 'venue',
      action: 'create_court',
      targetType: 'court',
      targetId: String(court.id),
    });

    return court;
  }

  async updateCourt(ctx: RequestContext, courtId: number, data: UpdateCourtDto) {
    const court = await this.getCourtById(ctx, courtId);

    const updated = await this.prisma.court.update({
      where: { id: courtId },
      data,
    });

    await this.auditService.log(ctx, {
      category: 'venue',
      action: 'update_court',
      targetType: 'court',
      targetId: String(courtId),
    });

    return updated;
  }

  async deleteCourt(ctx: RequestContext, courtId: number) {
    await this.getCourtById(ctx, courtId);

    await this.prisma.court.update({
      where: { id: courtId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log(ctx, {
      category: 'venue',
      action: 'delete_court',
      targetType: 'court',
      targetId: String(courtId),
    });

    return { success: true };
  }

  async getSchedules(ctx: RequestContext, venueId: number, date: string, courtId?: number) {
    const playDate = new Date(date);

    const where: any = {
      venueId,
      tenantId: ctx.tenantId,
      playDate,
      deletedAt: null,
    };

    if (courtId) {
      where.courtId = courtId;
    }

    const schedules = await this.prisma.courtSchedule.findMany({
      where,
      orderBy: [
        { courtId: 'asc' },
        { startTime: 'asc' },
      ],
    });

    const courtMap = new Map<string, any>();
    for (const schedule of schedules) {
      const courtIdStr = String(schedule.courtId);
      if (!courtMap.has(courtIdStr)) {
        const court = await this.prisma.court.findUnique({
          where: { id: schedule.courtId },
        });
        courtMap.set(courtIdStr, {
          id: court?.id,
          code: court?.code,
          type: court?.type,
          blocks: [],
        });
      }
      courtMap.get(courtIdStr)!.blocks.push({
        id: schedule.id,
        start: schedule.startTime,
        end: schedule.endTime,
        price: schedule.price,
        status: schedule.status,
        version: schedule.version,
      });
    }

    return {
      venue: await this.getVenueById(ctx, venueId),
      date,
      courts: Array.from(courtMap.values()),
    };
  }

  async generateSchedules(ctx: RequestContext, venueId: number, data: GenerateSchedulesDto) {
    const venue = await this.getVenueById(ctx, venueId);
    const courts = await this.getCourts(ctx, venueId);

    const days = data.days || 14;
    const startHour = data.startHour || 9;
    const endHour = data.endHour || 21;
    const slotMinutes = data.slotMinutes || 60;

    const today = new Date();
    const schedules: any[] = [];

    for (let day = 0; day < days; day++) {
      const playDate = new Date(today);
      playDate.setDate(playDate.getDate() + day);

      for (const court of courts) {
        for (let hour = startHour; hour < endHour; hour++) {
          for (let minute = 0; minute < 60; minute += slotMinutes) {
            const startTime = new Date(playDate);
            startTime.setHours(hour, minute, 0, 0);
            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + slotMinutes);

            if (endTime.getHours() > endHour || (endTime.getHours() === endHour && endTime.getMinutes() > 0)) {
              continue;
            }

            schedules.push({
              tenantId: ctx.tenantId,
              venueId,
              courtId: court.id,
              playDate,
              startTime,
              endTime,
              price: court.basePrice,
              status: 'available',
            });
          }
        }
      }
    }

    await this.prisma.courtSchedule.createMany({
      data: schedules,
      skipDuplicates: true,
    });

    await this.auditService.log(ctx, {
      category: 'venue',
      action: 'generate_schedules',
      targetType: 'venue',
      targetId: String(venueId),
      payload: { days, generated: schedules.length },
    });

    return { generated: schedules.length };
  }

  async updateSchedule(ctx: RequestContext, scheduleId: number, data: UpdateScheduleDto) {
    const schedule = await this.prisma.courtSchedule.findFirst({
      where: {
        id: scheduleId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!schedule) {
      throw new NotFoundException('排期不存在');
    }

    return this.prisma.courtSchedule.update({
      where: { id: scheduleId },
      data,
    });
  }

  async batchUpdateSchedules(ctx: RequestContext, data: BatchUpdateScheduleDto) {
    const updateData: any = {};

    if (data.price !== undefined) {
      updateData.price = data.price;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    await this.prisma.courtSchedule.updateMany({
      where: {
        id: { in: data.scheduleIds },
        tenantId: ctx.tenantId,
      },
      data: updateData,
    });

    await this.auditService.log(ctx, {
      category: 'venue',
      action: 'batch_update_schedules',
      targetType: 'court_schedule',
      payload: { scheduleIds: data.scheduleIds, ...updateData },
    });

    return { success: true, updated: data.scheduleIds.length };
  }
}
