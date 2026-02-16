import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  private getClient(): Redis {
    if (!this.client) {
      this.client = new Redis({
        host: this.configService.get<string>('notification.redis.host', 'localhost'),
        port: this.configService.get<number>('notification.redis.port', 6379),
        password: this.configService.get<string>('notification.redis.password') || undefined,
        lazyConnect: true,
        connectTimeout: 3000,
        commandTimeout: 2000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
    }
    return this.client;
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.getClient();
      await client.ping();
      return this.getStatus(key, true);
    } catch (error) {
      const result = this.getStatus(key, false, { message: (error as Error).message });
      throw new HealthCheckError('Redis check failed', result);
    }
  }

  onModuleDestroy(): void {
    if (this.client) {
      void this.client.quit();
      this.client = null;
    }
  }
}
