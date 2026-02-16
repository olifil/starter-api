import { Controller, Get, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { RedisHealthIndicator } from './redis.health-indicator';
import { HealthMonitorService } from './health-monitor.service';
import { Public } from '@shared/authorization/decorators/public.decorator';
import { RolesGuard } from '@shared/authorization/guards/roles.guard';
import { Roles } from '@shared/authorization/decorators/roles.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly healthMonitor: HealthMonitorService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @HealthCheck()
  @ApiOperation({ summary: 'Vérification de santé globale' })
  @ApiResponse({ status: 200, description: 'Service en bonne santé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès réservé aux SUPER_ADMIN' })
  @ApiResponse({ status: 503, description: 'Service indisponible' })
  check() {
    return this.health.check([
      // Vérification base de données
      () => this.prismaHealth.pingCheck('database', this.prisma),

      // Vérification mémoire (heap ne doit pas dépasser 512MB)
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),

      // Vérification RSS (ne doit pas dépasser 1GB)
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),

      // Vérification disque (au moins 50% libre)
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.5,
        }),

      // Vérification Redis
      () => this.redisHealth.pingCheck('redis'),
    ]);
  }

  @Get('live')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe pour Kubernetes' })
  @ApiResponse({ status: 200, description: 'Application vivante' })
  checkLiveness() {
    // Vérifie seulement que l'application répond
    return this.health.check([() => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024)]);
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe pour Kubernetes' })
  @ApiResponse({ status: 200, description: 'Application prête' })
  @ApiResponse({ status: 503, description: 'Application non prête' })
  checkReadiness() {
    // Vérifie que l'application peut servir des requêtes (DB + Redis accessibles)
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.redisHealth.pingCheck('redis'),
    ]);
  }

  @Get('db')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @HealthCheck()
  @ApiOperation({ summary: 'Vérification santé base de données' })
  @ApiResponse({ status: 200, description: 'Base de données accessible' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès réservé aux SUPER_ADMIN' })
  @ApiResponse({ status: 503, description: 'Base de données inaccessible' })
  checkDatabase() {
    return this.health.check([() => this.prismaHealth.pingCheck('database', this.prisma)]);
  }

  @Get('redis')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @HealthCheck()
  @ApiOperation({ summary: 'Vérification santé Redis' })
  @ApiResponse({ status: 200, description: 'Redis accessible' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès réservé aux SUPER_ADMIN' })
  @ApiResponse({ status: 503, description: 'Redis inaccessible' })
  checkRedis() {
    return this.health.check([() => this.redisHealth.pingCheck('redis')]);
  }

  @Post('trigger')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déclenche un cycle de monitoring immédiat (dev uniquement)' })
  @ApiResponse({ status: 200, description: 'Cycle de monitoring déclenché' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès réservé aux SUPER_ADMIN' })
  async triggerMonitor(): Promise<{ message: string }> {
    if (this.configService.get<string>('app.nodeEnv') === 'production') {
      return { message: 'Not available in production' };
    }
    await this.healthMonitor.triggerChecks();
    return { message: 'Health monitor cycle triggered' };
  }
}
