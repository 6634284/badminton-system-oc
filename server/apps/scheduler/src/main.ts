// apps/scheduler/src/main.ts

import { NestFactory } from '@nestjs/core';
import { SchedulerModule } from './scheduler.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SchedulerModule);
  console.log('Scheduler started');
}

bootstrap();
