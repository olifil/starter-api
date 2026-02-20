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
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { UserCreatedEvent } from '@modules/user/core/domain/events/user-created.event';
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';
import { TermsNotAcceptedException } from '@modules/auth/core/application/exceptions/terms-not-accepted.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

describe('RegisterService', () => {
  let service: RegisterService;
  let userRepository: jest.Mocked<IUserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let eventBus: jest.Mocked<EventBus>;
  let matomoService: jest.Mocked<MatomoService>;

  // Entité reconstruite depuis la DB (avec id fourni) — domainEvents vide
  const createSavedUser = (): User => {
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

  const mockConfig: Record<string, string> = {
    'jwt.verificationSecret': 'test-verification-secret',
    'jwt.verificationExpiresIn': '7d',
  };

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {
      existsByEmail: jest.fn(),
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
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventBus, useValue: mockEventBus },
        { provide: MatomoService, useValue: mockMatomoService },
      ],
    }).compile();

    service = module.get<RegisterService>(RegisterService);
    userRepository = module.get(USER_REPOSITORY);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    eventBus = module.get(EventBus);
    matomoService = module.get(MatomoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should successfully register a new user and return void', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe', true);

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(createSavedUser());
      configService.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key in mockConfig ? mockConfig[key] : defaultValue,
      );
      jwtService.sign.mockReturnValueOnce('verification-token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      // Act
      const result = await service.execute(command);

      // Assert
      expect(userRepository.existsByEmail).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'test@example.com' }),
      );
      expect(userRepository.save).toHaveBeenCalled();
      // Seul le token de vérification d'email est généré (plus d'access/refresh token)
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-123', email: 'test@example.com', type: 'email-verification' },
        expect.objectContaining({ secret: 'test-verification-secret' }),
      );
      expect(matomoService.trackUserRegistration).toHaveBeenCalledWith('user-123');
      expect(result).toBeUndefined();
    });

    it('should throw TermsNotAcceptedException when termsAccepted is false', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe', false);

      // Act & Assert
      await expect(service.execute(command)).rejects.toThrow(TermsNotAcceptedException);
      expect(userRepository.existsByEmail).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw EmailAlreadyExistsException when email is already taken', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe', true);
      userRepository.existsByEmail.mockResolvedValue(true);

      // Act & Assert
      await expect(service.execute(command)).rejects.toThrow(EmailAlreadyExistsException);
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should publish a UserCreatedEvent enriched with the verification token', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe', true);

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(createSavedUser());
      configService.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key in mockConfig ? mockConfig[key] : defaultValue,
      );
      jwtService.sign.mockReturnValueOnce('verification-token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      // Act
      await service.execute(command);

      // Assert — l'entité originale (pas savedUser) porte bien l'event
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationToken: 'verification-token',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
      );
    });

    it('should publish a UserCreatedEvent that is a UserCreatedEvent instance', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe', true);

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(createSavedUser());
      configService.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key in mockConfig ? mockConfig[key] : defaultValue,
      );
      jwtService.sign.mockReturnValueOnce('verification-token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      // Act
      await service.execute(command);

      // Assert
      const publishedEvent = eventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(UserCreatedEvent);
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const command = new RegisterCommand('Test@Example.COM', 'Password123!', 'John', 'Doe', true);

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(createSavedUser());
      configService.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key in mockConfig ? mockConfig[key] : defaultValue,
      );
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
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe', true);

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(createSavedUser());
      configService.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key in mockConfig ? mockConfig[key] : defaultValue,
      );
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
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe', true);

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(createSavedUser());
      configService.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key in mockConfig ? mockConfig[key] : defaultValue,
      );
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
  });
});
