import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';
import { RedisHealthIndicator } from '@shared/infrastructure/health/redis.health-indicator';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;

  const mockConfig = {
    get: jest.fn((key: string, defaultVal?: unknown) => {
      const map: Record<string, unknown> = {
        'notification.redis.host': 'localhost',
        'notification.redis.port': 6379,
      };
      return map[key] ?? defaultVal;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisHealthIndicator, { provide: ConfigService, useValue: mockConfig }],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  afterEach(() => {
    indicator.onModuleDestroy();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('pingCheck', () => {
    it('should return up status when Redis responds', async () => {
      const RedisMock = require('ioredis');
      RedisMock.mockImplementation(() => ({
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK'),
      }));

      // Re-create after mock reset
      const freshModule = await Test.createTestingModule({
        providers: [RedisHealthIndicator, { provide: ConfigService, useValue: mockConfig }],
      }).compile();
      const freshIndicator = freshModule.get<RedisHealthIndicator>(RedisHealthIndicator);

      const result = await freshIndicator.pingCheck('redis');

      expect(result).toEqual({ redis: { status: 'up' } });
      freshIndicator.onModuleDestroy();
    });

    it('should throw HealthCheckError when Redis is down', async () => {
      const RedisMock = require('ioredis');
      RedisMock.mockImplementation(() => ({
        ping: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        quit: jest.fn().mockResolvedValue('OK'),
      }));

      const freshModule = await Test.createTestingModule({
        providers: [RedisHealthIndicator, { provide: ConfigService, useValue: mockConfig }],
      }).compile();
      const freshIndicator = freshModule.get<RedisHealthIndicator>(RedisHealthIndicator);

      await expect(freshIndicator.pingCheck('redis')).rejects.toThrow(HealthCheckError);
      freshIndicator.onModuleDestroy();
    });
  });
});
