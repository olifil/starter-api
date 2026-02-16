import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterService } from '@modules/auth/core/application/commands/register/register.service';
import { RegisterCommand } from '@modules/auth/core/application/commands/register/register.command';
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
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

describe('RegisterService', () => {
  let service: RegisterService;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let eventBus: jest.Mocked<EventBus>;
  let matomoService: jest.Mocked<MatomoService>;

  const createMockUser = (): User => {
    return new User({
      id: 'user-123',
      email: new Email('test@example.com'),
      password: HashedPassword.fromHash('hashed-password'),
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {
      existsByEmail: jest.fn(),
      save: jest.fn(),
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
      trackUserRegistration: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterService,
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

    service = module.get<RegisterService>(RegisterService);
    userRepository = module.get(USER_REPOSITORY);
    refreshTokenRepository = module.get(REFRESH_TOKEN_REPOSITORY);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    eventBus = module.get(EventBus);
    matomoService = module.get(MatomoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should successfully register a new user and return tokens', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe');
      const mockUser = createMockUser();

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(mockUser);
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, string> = {
          'jwt.verificationSecret': 'test-verification-secret',
          'jwt.verificationExpiresIn': '7d',
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return key in config ? config[key] : defaultValue;
      });
      // sign appelé 3 fois : verification token, access token, refresh token
      jwtService.sign.mockReturnValueOnce('verification-token');
      jwtService.sign.mockReturnValueOnce('access-token');
      jwtService.sign.mockReturnValueOnce('refresh-token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      // Act
      const result = await service.execute(command);

      // Assert
      expect(userRepository.existsByEmail).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'test@example.com' }),
      );
      expect(userRepository.save).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledTimes(3);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-123', email: 'test@example.com', type: 'email-verification' },
        expect.objectContaining({ secret: 'test-verification-secret' }),
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-123', email: 'test@example.com' },
        { secret: 'test-secret', expiresIn: '15m' },
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-123', email: 'test@example.com', jti: expect.any(String) },
        { secret: 'test-refresh-secret', expiresIn: '7d' },
      );
      expect(matomoService.trackUserRegistration).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: '15m',
      });
    });

    it('should throw EmailAlreadyExistsException when email is already taken', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe');
      userRepository.existsByEmail.mockResolvedValue(true);

      // Act & Assert
      await expect(service.execute(command)).rejects.toThrow(EmailAlreadyExistsException);
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should publish domain events after saving user', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe');
      const mockUser = createMockUser();

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(mockUser);
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, string> = {
          'jwt.verificationSecret': 'test-verification-secret',
          'jwt.verificationExpiresIn': '7d',
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return key in config ? config[key] : defaultValue;
      });
      jwtService.sign.mockReturnValue('token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      // Act
      await service.execute(command);

      // Assert
      expect(eventBus.publish).toHaveBeenCalledTimes(mockUser.domainEvents.length);
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const command = new RegisterCommand('Test@Example.COM', 'Password123!', 'John', 'Doe');
      const mockUser = createMockUser();

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(mockUser);
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, string> = {
          'jwt.verificationSecret': 'test-verification-secret',
          'jwt.verificationExpiresIn': '7d',
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return key in config ? config[key] : defaultValue;
      });
      jwtService.sign.mockReturnValue('token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      // Act
      await service.execute(command);

      // Assert
      expect(userRepository.existsByEmail).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'test@example.com' }),
      );
    });

    it('should hash the password before saving', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe');
      const mockUser = createMockUser();

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(mockUser);
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, string> = {
          'jwt.verificationSecret': 'test-verification-secret',
          'jwt.verificationExpiresIn': '7d',
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return key in config ? config[key] : defaultValue;
      });
      jwtService.sign.mockReturnValue('token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      // Act
      await service.execute(command);

      // Assert
      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.password.hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('should create user with correct data', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe');
      const mockUser = createMockUser();

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(mockUser);
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, string> = {
          'jwt.verificationSecret': 'test-verification-secret',
          'jwt.verificationExpiresIn': '7d',
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return key in config ? config[key] : defaultValue;
      });
      jwtService.sign.mockReturnValue('token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      // Act
      await service.execute(command);

      // Assert
      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.email.value).toBe('test@example.com');
      expect(savedUser.firstName).toBe('John');
      expect(savedUser.lastName).toBe('Doe');
    });

    it('should use default expiresIn when config is not set', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe');
      const mockUser = createMockUser();

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(mockUser);
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
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      // Act
      const result = await service.execute(command);

      // Assert
      expect(result.expiresIn).toBe('15m');
    });
  });
});
