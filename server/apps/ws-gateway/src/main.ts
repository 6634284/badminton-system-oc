// apps/ws-gateway/src/main.ts

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { WsGatewayModule } from './ws-gateway.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    WsGatewayModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV === 'development' }),
  );

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.WS_PORT || 3003;
  await app.listen(port, '0.0.0.0');
  console.log(`WebSocket Gateway running on: http://localhost:${port}`);
}

bootstrap();
