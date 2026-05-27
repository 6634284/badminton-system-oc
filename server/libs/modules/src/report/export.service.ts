// libs/modules/src/report/export.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { QueueService } from '@app/infra/queue';
import { RequestContext } from '@app/shared/context';

export interface ExportTask {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async exportMembers(ctx: RequestContext, params: {
    level?: number;
    blacklisted?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    const taskId = `export_members_${Date.now()}`;

    await this.queueService.addJob('export', 'export-members', {
      taskId,
      tenantId: ctx.tenantId,
      params,
    });

    return { taskId, status: 'pending' };
  }

  async exportActivities(ctx: RequestContext, params: {
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const taskId = `export_activities_${Date.now()}`;

    await this.queueService.addJob('export', 'export-activities', {
      taskId,
      tenantId: ctx.tenantId,
      params,
    });

    return { taskId, status: 'pending' };
  }

  async exportFinancialReport(ctx: RequestContext, params: {
    startDate: string;
    endDate: string;
    type?: string;
  }) {
    const taskId = `export_finance_${Date.now()}`;

    await this.queueService.addJob('export', 'export-finance', {
      taskId,
      tenantId: ctx.tenantId,
      params,
    });

    return { taskId, status: 'pending' };
  }

  async getExportStatus(taskId: string): Promise<ExportTask> {
    // 从 Redis 获取导出状态
    // 简化处理，返回模拟数据
    return {
      id: taskId,
      type: 'members',
      status: 'completed',
      fileUrl: `/exports/${taskId}.csv`,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  async generateMemberCsv(members: any[]): Promise<string> {
    const headers = ['会员号', '昵称', '手机号', '等级', '积分', '消费金额', '加入时间'];
    const rows = members.map((m) => [
      m.memberNo,
      m.user?.nickname || '',
      m.user?.phone || '',
      `V${m.level}`,
      m.points,
      m.totalSpentAmount,
      m.joinedAt?.toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csv;
  }

  async generateActivityCsv(activities: any[]): Promise<string> {
    const headers = ['活动名称', '类型', '状态', '日期', '球馆', '报名人数', '容量', '价格'];
    const rows = activities.map((a) => [
      a.title,
      a.type,
      a.status,
      a.playDate?.toISOString()?.slice(0, 10),
      a.venue?.name || '',
      a.joinCount,
      a.capacity,
      a.price,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csv;
  }

  async generateFinancialCsv(data: {
    payments: any[];
    refunds: any[];
    recharges: any[];
  }): Promise<string> {
    const headers = ['类型', '金额', '时间', '状态'];
    const rows: string[][] = [];

    for (const p of data.payments) {
      rows.push(['支付', String(p.amount), p.paidAt?.toISOString(), p.status]);
    }

    for (const r of data.refunds) {
      rows.push(['退款', String(r.refundAmount), r.refundedAt?.toISOString(), r.status]);
    }

    for (const rc of data.recharges) {
      rows.push(['充值', String(rc.chargeAmount), rc.paidAt?.toISOString(), rc.payStatus]);
    }

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csv;
  }
}
