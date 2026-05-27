// libs/infra/src/queue/queue.service.ts

import { Injectable } from '@nestjs/common';
import { Queue, Worker, JobsOptions } from 'bullmq';
import { RedisService } from '../redis/redis.service';

export interface QueueJobOptions extends JobsOptions {
  queueName: string;
}

@Injectable()
export class QueueService {
  private queues: Map<string, Queue> = new Map();

  constructor(private redisService: RedisService) {}

  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.redisService.getClient(),
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobsOptions,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.add(jobName, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      ...options,
    });
  }

  async addDelayedJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    delay: number,
  ): Promise<void> {
    await this.addJob(queueName, jobName, data, { delay });
  }

  createWorker<T = any>(
    queueName: string,
    processor: (job: { name: string; data: T }) => Promise<void>,
  ): Worker {
    return new Worker(queueName, processor, {
      connection: this.redisService.getClient(),
      concurrency: 5,
    });
  }

  async onModuleDestroy() {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }
}
