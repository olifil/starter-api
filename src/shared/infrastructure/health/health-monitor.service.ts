import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { SendNotificationCommand } from '@modules/notification/core/application/commands/send-notification/send-notification.command';

type ServiceStatus = 'ok' | 'degraded';

interface CheckResult {
  status: ServiceStatus;
  details: string;
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class HealthMonitorService implements OnModuleInit {
  private readonly logger = new Logger(HealthMonitorService.name);
  private readonly statusMap = new Map<string, ServiceStatus>();

  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  onModuleInit(): void {
    this.logger.log(`Health monitor started (interval: ${CHECK_INTERVAL_MS / 1000}s)`);
  }

  /** Triggers a check cycle immediately, preserving current state (transitions OK↔DEGRADED). */
  async triggerChecks(): Promise<void> {
    await this.runChecks();
  }

  /** Resets all service statuses then re-runs checks. For unit tests only. */
  resetAndRun(): Promise<void> {
    this.statusMap.clear();
    return this.runChecks();
  }

  @Interval(CHECK_INTERVAL_MS)
  async runChecks(): Promise<void> {
    this.logger.debug('Running scheduled health checks...');

    const checks: [string, () => Promise<CheckResult>][] = [
      ['database', () => this.checkDatabase()],
      ['redis', () => this.checkRedis()],
      ['memory', () => this.checkMemory()],
    ];

    await Promise.allSettled(
      checks.map(async ([service, check]) => {
        const result = await check();
        await this.handleStatusChange(service, result.status, result.details);
      }),
    );
  }

  private async checkDatabase(): Promise<CheckResult> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      if (latency > 2000) {
        return { status: 'degraded', details: `Latence élevée: ${latency}ms` };
      }
      return { status: 'ok', details: `Latence: ${latency}ms` };
    } catch (error) {
      return { status: 'degraded', details: (error as Error).message };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    const Redis = await import('ioredis').then((m) => m.default);
    const client = new Redis({
      host: this.configService.get<string>('notification.redis.host', 'localhost'),
      port: this.configService.get<number>('notification.redis.port', 6379),
      password: this.configService.get<string>('notification.redis.password') || undefined,
      lazyConnect: true,
      connectTimeout: 3000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      retryStrategy: () => null, // Fail fast — ne pas retenter la connexion
    });

    try {
      await client.ping();
      return { status: 'ok', details: 'PONG reçu' };
    } catch (error) {
      return { status: 'degraded', details: (error as Error).message };
    } finally {
      client.quit().catch(() => void 0);
    }
  }

  private checkMemory(): Promise<CheckResult> {
    const heapUsed = process.memoryUsage().heapUsed;
    const heapTotal = process.memoryUsage().heapTotal;
    const heapPercent = Math.round((heapUsed / heapTotal) * 100);

    const HEAP_WARN_PERCENT = 85;

    if (heapPercent >= HEAP_WARN_PERCENT) {
      return Promise.resolve({
        status: 'degraded',
        details: `Heap: ${heapPercent}% (${Math.round(heapUsed / 1024 / 1024)}MB / ${Math.round(heapTotal / 1024 / 1024)}MB)`,
      });
    }

    return Promise.resolve({
      status: 'ok',
      details: `Heap: ${heapPercent}% (${Math.round(heapUsed / 1024 / 1024)}MB / ${Math.round(heapTotal / 1024 / 1024)}MB)`,
    });
  }

  private async handleStatusChange(
    service: string,
    newStatus: ServiceStatus,
    details: string,
  ): Promise<void> {
    const previousStatus = this.statusMap.get(service);

    // Initialisation : pas d'alerte au premier démarrage si tout va bien
    if (previousStatus === undefined) {
      this.statusMap.set(service, newStatus);
      if (newStatus === 'degraded') {
        this.logger.warn(`[HEALTH] ${service} is degraded at startup: ${details}`);
        await this.notifySuperAdmins(service, newStatus, details);
      }
      return;
    }

    // Changement d'état : alerte
    if (previousStatus !== newStatus) {
      this.statusMap.set(service, newStatus);

      if (newStatus === 'degraded') {
        this.logger.warn(`[HEALTH] ${service} degraded: ${details}`);
      } else {
        this.logger.log(`[HEALTH] ${service} recovered: ${details}`);
      }

      await this.notifySuperAdmins(service, newStatus, details);
    }
  }

  private async notifySuperAdmins(
    service: string,
    status: ServiceStatus,
    details: string,
  ): Promise<void> {
    const notificationsEnabled = this.configService.get<boolean>(
      'notification.healthMonitor.notificationsEnabled',
      true,
    );

    if (!notificationsEnabled) {
      this.logger.debug(`Health monitor notifications disabled — skipping alert for ${service}`);
      return;
    }

    let admins;
    try {
      admins = await this.userRepository.findByRole(Role.SUPER_ADMIN);
    } catch (error) {
      this.logger.error(
        `Cannot fetch SUPER_ADMIN users for health alert: ${(error as Error).message}`,
      );
      return;
    }

    if (admins.length === 0) {
      this.logger.debug('No SUPER_ADMIN users found, skipping health alert');
      return;
    }

    const appName = this.configService.get<string>('app.name', 'Starter API');
    const statusLabel = status === 'ok' ? 'rétabli' : 'dégradé';
    const timestamp = new Date().toISOString();

    await Promise.allSettled(
      admins.map((admin) =>
        this.commandBus.execute(
          new SendNotificationCommand(
            [admin.id],
            'health-alert',
            ['EMAIL', 'WEBSOCKET', 'WEB_PUSH'],
            { service, statusLabel, details, timestamp, appName },
            'fr',
          ),
        ),
      ),
    );

    this.logger.log(
      `Health alert sent to ${admins.length} SUPER_ADMIN(s): ${service} is ${statusLabel}`,
    );
  }
}
