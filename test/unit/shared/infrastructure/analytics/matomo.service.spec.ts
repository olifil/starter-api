import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

// Mock matomo-tracker
jest.mock('matomo-tracker', () => {
  return jest.fn().mockImplementation(() => ({
    track: jest.fn().mockResolvedValue(undefined),
  }));
});

describe('MatomoService', () => {
  let service: MatomoService;
  let configService: jest.Mocked<ConfigService>;
  let mockTracker: any;

  beforeEach(async () => {
    // Reset the mock before each test
    jest.clearAllMocks();

    const MatomoTracker = require('matomo-tracker');
    mockTracker = {
      track: jest.fn().mockResolvedValue(undefined),
    };
    MatomoTracker.mockImplementation(() => mockTracker);
  });

  describe('when Matomo is enabled', () => {
    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'matomo.url') return 'https://matomo.example.com';
          if (key === 'matomo.siteId') return 1;
          return null;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MatomoService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<MatomoService>(MatomoService);
      configService = module.get(ConfigService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize tracker when config is provided', () => {
      expect(configService.get).toHaveBeenCalledWith('matomo.url');
      expect(configService.get).toHaveBeenCalledWith('matomo.siteId');
    });

    describe('trackEvent', () => {
      it('should track event with all parameters', async () => {
        // Arrange
        const params = {
          category: 'Test',
          action: 'TestAction',
          name: 'TestName',
          value: 100,
          userId: 'user-123',
        };

        // Act
        await service.trackEvent(params);

        // Assert
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Test/TestAction',
          action_name: 'Test - TestAction',
          e_c: 'Test',
          e_a: 'TestAction',
          e_n: 'TestName',
          e_v: 100,
          uid: 'user-123',
        });
      });

      it('should track event without optional parameters', async () => {
        // Arrange
        const params = {
          category: 'Test',
          action: 'TestAction',
        };

        // Act
        await service.trackEvent(params);

        // Assert
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Test/TestAction',
          action_name: 'Test - TestAction',
          e_c: 'Test',
          e_a: 'TestAction',
          e_n: undefined,
          e_v: undefined,
          uid: undefined,
        });
      });

      it('should handle tracking errors gracefully', async () => {
        // Arrange
        mockTracker.track.mockRejectedValue(new Error('Network error'));
        const loggerSpy = jest.spyOn(service['logger'], 'error');

        // Act
        await service.trackEvent({
          category: 'Test',
          action: 'TestAction',
        });

        // Assert
        expect(loggerSpy).toHaveBeenCalledWith('Erreur tracking Matomo:', expect.any(Error));
      });
    });

    describe('trackUserRegistration', () => {
      it('should track user registration event', async () => {
        // Arrange
        const userId = 'user-123';

        // Act
        await service.trackUserRegistration(userId);

        // Assert
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/User/Register',
          action_name: 'User - Register',
          e_c: 'User',
          e_a: 'Register',
          e_n: undefined,
          e_v: undefined,
          uid: userId,
        });
      });
    });

    describe('trackUserLogin', () => {
      it('should track user login event', async () => {
        // Arrange
        const userId = 'user-456';

        // Act
        await service.trackUserLogin(userId);

        // Assert
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/User/Login',
          action_name: 'User - Login',
          e_c: 'User',
          e_a: 'Login',
          e_n: undefined,
          e_v: undefined,
          uid: userId,
        });
      });
    });
  });

  describe('when Matomo is disabled', () => {
    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn(() => null),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MatomoService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<MatomoService>(MatomoService);
      configService = module.get(ConfigService);
    });

    it('should not track events when disabled', async () => {
      // Act
      await service.trackEvent({
        category: 'Test',
        action: 'TestAction',
      });

      // Assert
      expect(mockTracker.track).not.toHaveBeenCalled();
    });

    it('should not track user registration when disabled', async () => {
      // Act
      await service.trackUserRegistration('user-123');

      // Assert
      expect(mockTracker.track).not.toHaveBeenCalled();
    });

    it('should not track user login when disabled', async () => {
      // Act
      await service.trackUserLogin('user-123');

      // Assert
      expect(mockTracker.track).not.toHaveBeenCalled();
    });
  });

  describe('when Matomo URL is missing', () => {
    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'matomo.siteId') return 1;
          return null;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MatomoService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<MatomoService>(MatomoService);
    });

    it('should not track events', async () => {
      // Act
      await service.trackEvent({
        category: 'Test',
        action: 'TestAction',
      });

      // Assert
      expect(mockTracker.track).not.toHaveBeenCalled();
    });
  });

  describe('when Matomo site ID is missing', () => {
    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'matomo.url') return 'https://matomo.example.com';
          return null;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MatomoService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<MatomoService>(MatomoService);
    });

    it('should not track events', async () => {
      // Act
      await service.trackEvent({
        category: 'Test',
        action: 'TestAction',
      });

      // Assert
      expect(mockTracker.track).not.toHaveBeenCalled();
    });
  });
});
