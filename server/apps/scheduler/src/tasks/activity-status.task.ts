// apps/scheduler/src/tasks/activity-status.task.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class ActivityStatusTask {
  private readonly logger = new Logger(ActivityStatusTask.name);

  constructor(private prisma: PrismaService) {}

  // 每5分钟检查活动状态
  @Cron('*/5 * * * *')
  async handleActivityStatus() {
    this.logger.log('Checking activity status...');

    const now = new Date();

    // 将已到开始时间的活动标记为进行中
    await this.prisma.activity.updateMany({
      where: {
        status: 'published',
        startAt: { lte: now },
        endAt: { gt: now },
      },
      data: { status: 'ongoing' },
    });

    // 将已到结束时间的活动标记为已结束
    await this.prisma.activity.updateMany({
      where: {
        status: 'ongoing',
        endAt: { lte: now },
      },
      data: { status: 'finished' },
    });

    // 将已到报名开始时间的活动标记为报名中
    await this.prisma.activity.updateMany({
      where: {
        status: 'published',
        registerOpenAt: { lte: now },
        registerCloseAt: { gt: now },
      },
      data: { status: 'registering' },
    });

    this.logger.log('Activity status check completed');
  }

  // 每天凌晨2点生成未来14天的排期
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleGenerateSchedules() {
    this.logger.log('Generating court schedules...');

    // 获取所有活跃的场地
    const courts = await this.prisma.court.findMany({
      where: {
        status: 'active',
        deletedAt: null,
      },
    });

    const today = new Date();
    const schedules: any[] = [];

    for (let day = 0; day < 14; day++) {
      const playDate = new Date(today);
      playDate.setDate(playDate.getDate() + day);

      for (const court of courts) {
        // 生成 9:00-21:00 的时段，每小时一个
        for (let hour = 9; hour < 21; hour++) {
          const startTime = new Date(playDate);
          startTime.setHours(hour, 0, 0, 0);
          const endTime = new Date(playDate);
          endTime.setHours(hour + 1, 0, 0, 0);

          schedules.push({
            tenantId: court.tenantId,
            venueId: court.venueId,
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

    // 批量创建
    await this.prisma.courtSchedule.createMany({
      data: schedules,
      skipDuplicates: true,
    });

    this.logger.log(`Generated ${schedules.length} court schedules`);
  }
}
