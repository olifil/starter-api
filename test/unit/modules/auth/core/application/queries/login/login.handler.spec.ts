import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginHandler } from '@modules/auth/core/application/queries/login/login.handler';
import { LoginQuery } from '@modules/auth/core/application/queries/login/login.query';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '@modules/auth/core/domain/repositories/refresh-token.repository.interface';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { InvalidCredentialsException } from '@modules/auth/core/application/exceptions/invalid-credentials.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

describe('LoginHandler', () => {
  let handler: LoginHandler;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let eventBus: jest.Mocked<EventBus>;
  let matomoService: jest.Mocked<MatomoService>;

  const createMockUser = async (): Promise<User> => {
    const password = await HashedPassword.fromPlainPassword('Password123!');
    return new User({
      id: 'user-123',
      email: new Email('test@example.com'),
      password,
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {
      findByEmail: jest.fn(),
    };

    const mockRefreshTokenRepository: Partial<IRefreshTokenRepository> = {
      save: jest.fn(),
    };

    const mockJwtService: Partial<JwtService> = {
      sign: jest.fn(),
    };

    const mockConfigService: Partial<ConfigService> = {
      get: jest.fn(),
    };

    const mockEventBus: Partial<EventBus> = {
      publish: jest.fn(),
    };

    const mockMatomoService: Partial<MatomoService> = {
      trackUserLogin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginHandler,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: REFRESH_TOKEN_REPOSITORY,
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: MatomoService,
          useValue: mockMatomoService,
        },
      ],
    }).compile();

    handler = module.get<LoginHandler>(LoginHandler);
    userRepository = module.get(USER_REPOSITORY);
    refreshTokenRepository = module.get(REFRESH_TOKEN_REPOSITORY);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    eventBus = module.get(EventBus);
    matomoService = module.get(MatomoService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should successfully login with valid credentials and return tokens', async () => {
      // Arrange
      const query = new LoginQuery('test@example.com', 'Password123!');
      const mockUser = await createMockUser();

      userRepository.findByEmail.mockResolvedValue(mockUser);
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return config[key];
      });
      jwtService.sign.mockReturnValueOnce('access-token');
      jwtService.sign.mockReturnValueOnce('refresh-token');
      matomoService.trackUserLogin.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'test@example.com' }),
      );
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-123', email: 'test@example.com' },
        { secret: 'test-secret', expiresIn: '15m' },
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-123', email: 'test@example.com', jti: expect.any(String) },
        { secret: 'test-refresh-secret', expiresIn: '7d' },
      );
      expect(matomoService.trackUserLogin).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: '15m',
      });
    });

    it('should throw InvalidCredentialsException when user is not found', async () => {
      // Arrange
      const query = new LoginQuery('unknown@example.com', 'Password123!');
      userRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(InvalidCredentialsException);
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(matomoService.trackUserLogin).not.toHaveBeenCalled();
    });

    it('should throw InvalidCredentialsException when password is incorrect', async () => {
      // Arrange
      const query = new LoginQuery('test@example.com', 'WrongPassword123!');
      const mockUser = await createMockUser();

      userRepository.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(InvalidCredentialsException);
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(matomoService.trackUserLogin).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const query = new LoginQuery('Test@Example.COM', 'Password123!');
      const mockUser = await createMockUser();

      userRepository.findByEmail.mockResolvedValue(mockUser);
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, string> = {
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return key in config ? config[key] : defaultValue;
      });
      jwtService.sign.mockReturnValue('token');
      matomoService.trackUserLogin.mockResolvedValue(undefined);

      // Act
      await handler.execute(query);

      // Assert
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'test@example.com' }),
      );
    });

    it('should use default expiresIn when config is not set', async () => {
      // Arrange
      const query = new LoginQuery('test@example.com', 'Password123!');
      const mockUser = await createMockUser();

      userRepository.findByEmail.mockResolvedValue(mockUser);
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string | undefined> = {
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': undefined, // No config set
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return config[key];
      });
      jwtService.sign.mockReturnValue('token');
      matomoService.trackUserLogin.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.expiresIn).toBe('15m');
    });

    it('should generate JWT payload with correct user data', async () => {
      // Arrange
      const query = new LoginQuery('test@example.com', 'Password123!');
      const mockUser = await createMockUser();

      userRepository.findByEmail.mockResolvedValue(mockUser);
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, string> = {
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return key in config ? config[key] : defaultValue;
      });
      jwtService.sign.mockReturnValue('token');
      matomoService.trackUserLogin.mockResolvedValue(undefined);

      // Act
      await handler.execute(query);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-123',
          email: 'test@example.com',
        }),
        expect.any(Object),
      );
    });
  });
});
