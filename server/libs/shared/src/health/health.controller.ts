// libs/shared/src/health/health.controller.ts

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: '健康检查' })
  async check() {
    const checks: Record<string, string> = {};

    // 检查数据库
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (error) {
      checks.database = 'error';
    }

    // 检查 Redis
    try {
      await this.redis.getClient().ping();
      checks.redis = 'ok';
    } catch (error) {
      checks.redis = 'error';
    }

    const isHealthy = Object.values(checks).every((v) => v === 'ok');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: '就绪检查' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return { status: 'not_ready' };
    }
  }

  @Get('live')
  @ApiOperation({ summary: '存活检查' })
  async live() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }
}
