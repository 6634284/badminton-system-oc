// apps/ws-gateway/src/ws-gateway.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/infra/prisma';
import { RedisModule } from '@app/infra/redis';
import { ActivityWsGateway } from './gateways/activity.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
  ],
  providers: [ActivityWsGateway],
})
export class WsGatewayModule {}
