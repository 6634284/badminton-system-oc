// libs/modules/src/system/system-config.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';
import { RequestContext } from '@app/shared/context';
import { AuditService } from '@app/shared/audit';

export interface SystemConfig {
  key: string;
  value: any;
  remark?: string;
}

@Injectable()
export class SystemConfigService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private auditService: AuditService,
  ) {}

  async getConfig(key: string): Promise<any> {
    // 先从缓存获取
    const cached = await this.redis.get(`config:${key}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      return null;
    }

    // 缓存 5 分钟
    await this.redis.set(`config:${key}`, JSON.stringify(config.value), 300);

    return config.value;
  }

  async setConfig(ctx: RequestContext, data: SystemConfig) {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key: data.key },
    });

    let config;
    if (existing) {
      config = await this.prisma.systemConfig.update({
        where: { key: data.key },
        data: {
          value: data.value,
          remark: data.remark,
        },
      });

      await this.auditService.log(ctx, {
        category: 'system',
        action: 'update_config',
        targetType: 'system_config',
        targetId: data.key,
        beforeJson: existing.value,
        afterJson: data.value,
      });
    } else {
      config = await this.prisma.systemConfig.create({
        data: {
          key: data.key,
          value: data.value,
          remark: data.remark,
        },
      });

      await this.auditService.log(ctx, {
        category: 'system',
        action: 'create_config',
        targetType: 'system_config',
        targetId: data.key,
      });
    }

    // 更新缓存
    await this.redis.set(`config:${data.key}`, JSON.stringify(data.value), 300);

    return config;
  }

  async getAllConfigs() {
    const configs = await this.prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });

    return configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as Record<string, any>);
  }

  async deleteConfig(ctx: RequestContext, key: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    await this.prisma.systemConfig.delete({
      where: { key },
    });

    // 清除缓存
    await this.redis.del(`config:${key}`);

    await this.auditService.log(ctx, {
      category: 'system',
      action: 'delete_config',
      targetType: 'system_config',
      targetId: key,
    });

    return { success: true };
  }

  // 预定义配置获取方法
  async getCancelPolicy(): Promise<any> {
    return this.getConfig('cancel_policy') || {
      before_24h: 1.0,
      before_2h: 0.5,
      within_2h: 0,
    };
  }

  async getBusinessHours(): Promise<any> {
    return this.getConfig('business_hours') || {
      weekday: { start: '09:00', end: '21:00' },
      weekend: { start: '08:00', end: '22:00' },
    };
  }

  async getPaymentChannels(): Promise<any> {
    return this.getConfig('payment_channels') || {
      wechat: { enabled: true },
      alipay: { enabled: false },
      wallet: { enabled: true },
    };
  }

  async getRealnameThresholds(): Promise<any> {
    return this.getConfig('realname_thresholds') || {
      single_recharge: 200,
      daily_recharge: 500,
      withdrawal: 1000,
    };
  }
}
