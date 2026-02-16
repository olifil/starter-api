// Mock ioredis before imports to prevent real connections
jest.mock('ioredis', () => {
  const mockClient = {
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  return jest.fn().mockImplementation(() => mockClient);
});

import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { HealthMonitorService } from '@shared/infrastructure/health/health-monitor.service';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { PrismaService } from '@database/prisma.service';
import { SendNotificationCommand } from '@modules/notification/core/application/commands/send-notification/send-notification.command';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { Role } from '@prisma/client';

const makeSuperAdmin = (id = 'admin-1') =>
  new User({
    id,
    email: new Email(`${id}@example.com`),
    password: HashedPassword.fromHash('hashed'),
    firstName: 'Super',
    lastName: 'Admin',
    role: Role.SUPER_ADMIN,
    emailVerified: true,
  });

describe('HealthMonitorService', () => {
  let service: HealthMonitorService;
  let commandBus: jest.Mocked<CommandBus>;
  let userRepository: jest.Mocked<IUserRepository>;
  let prisma: jest.Mocked<Pick<PrismaService, '$queryRaw'>>;

  beforeEach(async () => {
    const mockCommandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    const mockUserRepository: jest.Mocked<IUserRepository> = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      existsByEmail: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findByRole: jest.fn(),
      searchByName: jest.fn(),
      findByIds: jest.fn(),
    };
    const mockPrisma = { $queryRaw: jest.fn() };
    const mockConfig = {
      get: jest.fn((key: string, defaultVal?: unknown) => {
        const map: Record<string, unknown> = {
          'notification.redis.host': 'localhost',
          'notification.redis.port': 6379,
          'app.name': 'TestApp',
        };
        return map[key] ?? defaultVal;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthMonitorService,
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<HealthMonitorService>(HealthMonitorService);
    commandBus = module.get(CommandBus);
    userRepository = module.get(USER_REPOSITORY);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runChecks', () => {
    it('should send alert to SUPER_ADMIN users when DB is degraded', async () => {
      prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection refused'));
      userRepository.findByRole.mockResolvedValue([makeSuperAdmin()]);

      await service.runChecks();

      expect(userRepository.findByRole).toHaveBeenCalledWith(Role.SUPER_ADMIN);
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(SendNotificationCommand));
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: ['admin-1'],
          type: 'health-alert',
        }),
      );
    });

    it('should not send alert when all services are healthy', async () => {
      prisma.$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);
      userRepository.findByRole.mockResolvedValue([makeSuperAdmin()]);

      await service.runChecks();

      // Premier appel: statut initialisé à 'ok', pas d'alerte
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('should not send duplicate alerts when status stays degraded', async () => {
      prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('DB down'));
      userRepository.findByRole.mockResolvedValue([makeSuperAdmin()]);

      // Premier cycle — initialisation dégradée
      await service.runChecks();
      const firstCallCount = commandBus.execute.mock.calls.length;

      // Deuxième cycle — même état, pas de nouvelle alerte
      await service.runChecks();
      expect(commandBus.execute).toHaveBeenCalledTimes(firstCallCount);
    });

    it('should send recovery alert when status changes from degraded to ok', async () => {
      userRepository.findByRole.mockResolvedValue([makeSuperAdmin()]);

      // Cycle 1: DB down
      prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('DB down'));
      await service.runChecks();

      // Cycle 2: DB recovered
      prisma.$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);
      await service.runChecks();

      // Should have called commandBus twice: degraded + recovered
      const dbCalls = commandBus.execute.mock.calls.filter((call) => {
        const cmd = call[0] as SendNotificationCommand;
        return cmd.variables['service'] === 'database';
      });
      expect(dbCalls.length).toBe(2);

      const statusLabels = dbCalls.map(
        (call) => (call[0] as SendNotificationCommand).variables['statusLabel'],
      );
      expect(statusLabels).toContain('dégradé');
      expect(statusLabels).toContain('rétabli');
    });

    it('should not crash when no SUPER_ADMIN users exist', async () => {
      prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('DB down'));
      userRepository.findByRole.mockResolvedValue([]);

      await expect(service.runChecks()).resolves.not.toThrow();
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('should notify multiple SUPER_ADMIN users', async () => {
      prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('DB down'));
      userRepository.findByRole.mockResolvedValue([
        makeSuperAdmin('admin-1'),
        makeSuperAdmin('admin-2'),
      ]);

      await service.runChecks();

      const notifiedUsers = commandBus.execute.mock.calls
        .flatMap((call) => (call[0] as SendNotificationCommand).userIds)
        .filter((id) => ['admin-1', 'admin-2'].includes(id));

      expect(notifiedUsers).toContain('admin-1');
      expect(notifiedUsers).toContain('admin-2');
    });

    it('should include all three channels in alert notification', async () => {
      prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('DB down'));
      userRepository.findByRole.mockResolvedValue([makeSuperAdmin()]);

      await service.runChecks();

      const cmd = commandBus.execute.mock.calls.find((call) => {
        const c = call[0] as SendNotificationCommand;
        return c.type === 'health-alert' && c.variables['service'] === 'database';
      });
      expect(cmd).toBeDefined();
      const channels = (cmd![0] as SendNotificationCommand).channels;
      expect(channels).toContain('EMAIL');
      expect(channels).toContain('WEBSOCKET');
      expect(channels).toContain('WEB_PUSH');
    });
  });

  describe('HEALTH_MONITOR_NOTIFICATIONS_ENABLED=false', () => {
    let serviceDisabled: HealthMonitorService;
    let disabledCommandBus: jest.Mocked<CommandBus>;
    let disabledPrisma: { $queryRaw: jest.Mock };

    beforeEach(async () => {
      disabledCommandBus = {
        execute: jest.fn().mockResolvedValue(undefined),
      } as unknown as jest.Mocked<CommandBus>;
      disabledPrisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('DB down')) };

      const mockUserRepository: jest.Mocked<IUserRepository> = {
        save: jest.fn(),
        findById: jest.fn(),
        findByEmail: jest.fn(),
        update: jest.fn(),
        existsByEmail: jest.fn(),
        delete: jest.fn(),
        findAll: jest.fn(),
        findByRole: jest.fn().mockResolvedValue([makeSuperAdmin()]),
      };
      const mockConfig = {
        get: jest.fn((key: string, defaultVal?: unknown) => {
          const map: Record<string, unknown> = {
            'notification.redis.host': 'localhost',
            'notification.redis.port': 6379,
            'app.name': 'TestApp',
            'notification.healthMonitor.notificationsEnabled': false,
          };
          return map[key] ?? defaultVal;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HealthMonitorService,
          { provide: CommandBus, useValue: disabledCommandBus },
          { provide: USER_REPOSITORY, useValue: mockUserRepository },
          { provide: PrismaService, useValue: disabledPrisma },
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      serviceDisabled = module.get<HealthMonitorService>(HealthMonitorService);
    });

    it('should not send any notification when notifications are disabled', async () => {
      await serviceDisabled.runChecks();

      expect(disabledCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should still run health checks even when notifications are disabled', async () => {
      await serviceDisabled.runChecks();

      expect(disabledPrisma.$queryRaw).toHaveBeenCalled();
    });
  });
});
