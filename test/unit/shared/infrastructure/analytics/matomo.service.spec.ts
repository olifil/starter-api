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

    describe('trackUserLogout', () => {
      it('should track user logout event', async () => {
        const userId = 'user-789';
        await service.trackUserLogout(userId);
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Auth/Logout',
          action_name: 'Auth - Logout',
          e_c: 'Auth',
          e_a: 'Logout',
          e_n: undefined,
          e_v: undefined,
          uid: userId,
        });
      });
    });

    describe('trackLoginFailed', () => {
      it('should track login failed event without userId', async () => {
        await service.trackLoginFailed();
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Auth/LoginFailed',
          action_name: 'Auth - LoginFailed',
          e_c: 'Auth',
          e_a: 'LoginFailed',
          e_n: undefined,
          e_v: undefined,
          uid: undefined,
        });
      });
    });

    describe('trackEmailVerified', () => {
      it('should track email verified event', async () => {
        const userId = 'user-123';
        await service.trackEmailVerified(userId);
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Auth/EmailVerified',
          action_name: 'Auth - EmailVerified',
          e_c: 'Auth',
          e_a: 'EmailVerified',
          e_n: undefined,
          e_v: undefined,
          uid: userId,
        });
      });
    });

    describe('trackPasswordResetRequested', () => {
      it('should track password reset requested event without userId', async () => {
        await service.trackPasswordResetRequested();
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Auth/PasswordResetRequested',
          action_name: 'Auth - PasswordResetRequested',
          e_c: 'Auth',
          e_a: 'PasswordResetRequested',
          e_n: undefined,
          e_v: undefined,
          uid: undefined,
        });
      });
    });

    describe('trackPasswordResetCompleted', () => {
      it('should track password reset completed event', async () => {
        const userId = 'user-123';
        await service.trackPasswordResetCompleted(userId);
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Auth/PasswordResetCompleted',
          action_name: 'Auth - PasswordResetCompleted',
          e_c: 'Auth',
          e_a: 'PasswordResetCompleted',
          e_n: undefined,
          e_v: undefined,
          uid: userId,
        });
      });
    });

    describe('trackTokenRefresh', () => {
      it('should track token refresh event', async () => {
        const userId = 'user-123';
        await service.trackTokenRefresh(userId);
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Auth/TokenRefresh',
          action_name: 'Auth - TokenRefresh',
          e_c: 'Auth',
          e_a: 'TokenRefresh',
          e_n: undefined,
          e_v: undefined,
          uid: userId,
        });
      });
    });

    describe('trackUserProfileUpdated', () => {
      it('should track user profile updated event', async () => {
        const userId = 'user-123';
        await service.trackUserProfileUpdated(userId);
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/User/ProfileUpdated',
          action_name: 'User - ProfileUpdated',
          e_c: 'User',
          e_a: 'ProfileUpdated',
          e_n: undefined,
          e_v: undefined,
          uid: userId,
        });
      });
    });

    describe('trackUserDeleted', () => {
      it('should track user deleted event', async () => {
        const userId = 'user-123';
        await service.trackUserDeleted(userId);
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/User/Deleted',
          action_name: 'User - Deleted',
          e_c: 'User',
          e_a: 'Deleted',
          e_n: undefined,
          e_v: undefined,
          uid: userId,
        });
      });
    });

    describe('trackNotificationSent', () => {
      it('should track notification sent event with channel as name', async () => {
        const userId = 'user-123';
        await service.trackNotificationSent(userId, 'EMAIL');
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Notification/Sent',
          action_name: 'Notification - Sent',
          e_c: 'Notification',
          e_a: 'Sent',
          e_n: 'EMAIL',
          e_v: undefined,
          uid: userId,
        });
      });
    });

    describe('trackNotificationFailed', () => {
      it('should track notification failed event with channel as name', async () => {
        const userId = 'user-123';
        await service.trackNotificationFailed(userId, 'SMS');
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Notification/Failed',
          action_name: 'Notification - Failed',
          e_c: 'Notification',
          e_a: 'Failed',
          e_n: 'SMS',
          e_v: undefined,
          uid: userId,
        });
      });
    });

    describe('trackNotificationPreferencesUpdated', () => {
      it('should track notification preferences updated event', async () => {
        const userId = 'user-123';
        await service.trackNotificationPreferencesUpdated(userId);
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Notification/PreferencesUpdated',
          action_name: 'Notification - PreferencesUpdated',
          e_c: 'Notification',
          e_a: 'PreferencesUpdated',
          e_n: undefined,
          e_v: undefined,
          uid: userId,
        });
      });
    });

    describe('trackNotificationMarkedAsRead', () => {
      it('should track notification marked as read event', async () => {
        const userId = 'user-123';
        await service.trackNotificationMarkedAsRead(userId);
        expect(mockTracker.track).toHaveBeenCalledWith({
          url: 'http://api/event/Notification/MarkedAsRead',
          action_name: 'Notification - MarkedAsRead',
          e_c: 'Notification',
          e_a: 'MarkedAsRead',
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
