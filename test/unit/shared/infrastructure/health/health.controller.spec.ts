import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from '@shared/infrastructure/health/health.controller';
import {
  HealthCheckService,
  HealthCheckResult,
  HealthCheckStatus,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@database/prisma.service';
import { RedisHealthIndicator } from '@shared/infrastructure/health/redis.health-indicator';
import { HealthMonitorService } from '@shared/infrastructure/health/health-monitor.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let prismaHealthIndicator: jest.Mocked<PrismaHealthIndicator>;
  let memory: jest.Mocked<MemoryHealthIndicator>;
  let disk: jest.Mocked<DiskHealthIndicator>;
  let prismaService: jest.Mocked<PrismaService>;
  let redisHealthIndicator: jest.Mocked<RedisHealthIndicator>;
  let healthMonitorService: jest.Mocked<HealthMonitorService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockPrismaHealthIndicator = {
      pingCheck: jest.fn(),
    };

    const mockMemoryHealthIndicator = {
      checkHeap: jest.fn(),
      checkRSS: jest.fn(),
    };

    const mockDiskHealthIndicator = {
      checkStorage: jest.fn(),
    };

    const mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    const mockRedisHealthIndicator = {
      pingCheck: jest.fn(),
    };

    const mockHealthMonitorService = {
      triggerChecks: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('development'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisHealthIndicator,
          useValue: mockRedisHealthIndicator,
        },
        {
          provide: HealthMonitorService,
          useValue: mockHealthMonitorService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    prismaHealthIndicator = module.get(PrismaHealthIndicator);
    memory = module.get(MemoryHealthIndicator);
    disk = module.get(DiskHealthIndicator);
    prismaService = module.get(PrismaService);
    redisHealthIndicator = module.get(RedisHealthIndicator);
    healthMonitorService = module.get(HealthMonitorService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should perform health check with all indicators including Redis', async () => {
      const expectedResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
          redis: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
          redis: { status: 'up' },
        },
      };

      healthCheckService.check.mockResolvedValue(expectedResult as unknown as HealthCheckResult);

      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);
      expect(result).toEqual(expectedResult);
    });

    it('should check database health', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        await checks[0]();
        return {} as HealthCheckResult;
      });

      await controller.check();

      expect(prismaHealthIndicator.pingCheck).toHaveBeenCalledWith('database', prismaService);
    });

    it('should check memory heap with 512MB threshold', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        await checks[1]();
        return {} as HealthCheckResult;
      });

      await controller.check();

      expect(memory.checkHeap).toHaveBeenCalledWith('memory_heap', 512 * 1024 * 1024);
    });

    it('should check memory RSS with 1GB threshold', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        await checks[2]();
        return {} as HealthCheckResult;
      });

      await controller.check();

      expect(memory.checkRSS).toHaveBeenCalledWith('memory_rss', 1024 * 1024 * 1024);
    });

    it('should check disk storage with 50% threshold', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        await checks[3]();
        return {} as HealthCheckResult;
      });

      await controller.check();

      expect(disk.checkStorage).toHaveBeenCalledWith('disk', {
        path: '/',
        thresholdPercent: 0.5,
      });
    });

    it('should check Redis', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        await checks[4]();
        return {} as HealthCheckResult;
      });

      await controller.check();

      expect(redisHealthIndicator.pingCheck).toHaveBeenCalledWith('redis');
    });
  });

  describe('checkLiveness', () => {
    it('should check liveness with memory heap only', async () => {
      const expectedResult = {
        status: 'ok',
        info: { memory_heap: { status: 'up' } },
        error: {},
        details: { memory_heap: { status: 'up' } },
      };

      healthCheckService.check.mockResolvedValue(expectedResult as unknown as HealthCheckResult);

      const result = await controller.checkLiveness();

      expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
      expect(result).toEqual(expectedResult);
    });

    it('should check memory heap with 1GB threshold', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        await checks[0]();
        return {} as HealthCheckResult;
      });

      await controller.checkLiveness();

      expect(memory.checkHeap).toHaveBeenCalledWith('memory_heap', 1024 * 1024 * 1024);
    });
  });

  describe('checkReadiness', () => {
    it('should check database and Redis for readiness', async () => {
      const expectedResult = {
        status: 'ok',
        info: { database: { status: 'up' }, redis: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' }, redis: { status: 'up' } },
      };

      healthCheckService.check.mockResolvedValue(expectedResult as unknown as HealthCheckResult);

      const result = await controller.checkReadiness();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
      expect(result).toEqual(expectedResult);
    });

    it('should call prisma and redis ping checks for readiness', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        await Promise.all(checks.map((c) => c()));
        return {} as HealthCheckResult;
      });

      await controller.checkReadiness();

      expect(prismaHealthIndicator.pingCheck).toHaveBeenCalledWith('database', prismaService);
      expect(redisHealthIndicator.pingCheck).toHaveBeenCalledWith('redis');
    });
  });

  describe('checkDatabase', () => {
    it('should check database health', async () => {
      const expectedResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };

      healthCheckService.check.mockResolvedValue(expectedResult as unknown as HealthCheckResult);

      const result = await controller.checkDatabase();

      expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
      expect(result).toEqual(expectedResult);
    });

    it('should call prisma ping check', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        await checks[0]();
        return {} as HealthCheckResult;
      });

      await controller.checkDatabase();

      expect(prismaHealthIndicator.pingCheck).toHaveBeenCalledWith('database', prismaService);
    });
  });

  describe('checkRedis', () => {
    it('should check Redis health', async () => {
      const expectedResult = {
        status: 'ok',
        info: { redis: { status: 'up' } },
        error: {},
        details: { redis: { status: 'up' } },
      };

      healthCheckService.check.mockResolvedValue(expectedResult as unknown as HealthCheckResult);

      const result = await controller.checkRedis();

      expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
      expect(result).toEqual(expectedResult);
    });

    it('should call redis ping check', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        await checks[0]();
        return {} as HealthCheckResult;
      });

      await controller.checkRedis();

      expect(redisHealthIndicator.pingCheck).toHaveBeenCalledWith('redis');
    });
  });

  describe('triggerMonitor', () => {
    it('should trigger health monitor checks in development', async () => {
      configService.get.mockReturnValue('development');

      const result = await controller.triggerMonitor();

      expect(healthMonitorService.triggerChecks).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Health monitor cycle triggered' });
    });

    it('should not trigger checks in production', async () => {
      configService.get.mockReturnValue('production');

      const result = await controller.triggerMonitor();

      expect(healthMonitorService.triggerChecks).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Not available in production' });
    });
  });
});
