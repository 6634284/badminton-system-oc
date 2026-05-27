// apps/open-api/src/main.ts

import '../../../polyfills/bigint';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { OpenApiModule } from './open-api.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    OpenApiModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV === 'development' }),
  );

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.OPEN_PORT || 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`Open API running on: http://localhost:${port}`);
}

bootstrap();
