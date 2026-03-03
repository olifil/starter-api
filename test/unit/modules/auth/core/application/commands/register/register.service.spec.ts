import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { RegisterService } from '@modules/auth/core/application/commands/register/register.service';
import { RegisterCommand } from '@modules/auth/core/application/commands/register/register.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { EmailTokenService } from '@modules/auth/core/application/services/email-token.service';
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
  let emailTokenService: jest.Mocked<EmailTokenService>;
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

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {
      existsByEmail: jest.fn(),
      save: jest.fn(),
    };

    const mockEmailTokenService = {
      generateVerificationToken: jest.fn(),
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
        { provide: EmailTokenService, useValue: mockEmailTokenService },
        { provide: EventBus, useValue: mockEventBus },
        { provide: MatomoService, useValue: mockMatomoService },
      ],
    }).compile();

    service = module.get<RegisterService>(RegisterService);
    userRepository = module.get(USER_REPOSITORY);
    emailTokenService = module.get(EmailTokenService);
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
      emailTokenService.generateVerificationToken.mockResolvedValueOnce('verification-token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      // Act
      const result = await service.execute(command);

      // Assert
      expect(userRepository.existsByEmail).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'test@example.com' }),
      );
      expect(userRepository.save).toHaveBeenCalled();
      expect(emailTokenService.generateVerificationToken).toHaveBeenCalledTimes(1);
      expect(emailTokenService.generateVerificationToken).toHaveBeenCalledWith(
        'user-123',
        'test@example.com',
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
      expect(emailTokenService.generateVerificationToken).not.toHaveBeenCalled();
    });

    it('should throw EmailAlreadyExistsException when email is already taken', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe', true);
      userRepository.existsByEmail.mockResolvedValue(true);

      // Act & Assert
      await expect(service.execute(command)).rejects.toThrow(EmailAlreadyExistsException);
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(emailTokenService.generateVerificationToken).not.toHaveBeenCalled();
    });

    it('should publish a UserCreatedEvent enriched with the verification token', async () => {
      // Arrange
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe', true);

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(createSavedUser());
      emailTokenService.generateVerificationToken.mockResolvedValueOnce('verification-token');
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
      emailTokenService.generateVerificationToken.mockResolvedValueOnce('verification-token');
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
      emailTokenService.generateVerificationToken.mockResolvedValue('token');
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
      emailTokenService.generateVerificationToken.mockResolvedValue('token');
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
      emailTokenService.generateVerificationToken.mockResolvedValue('token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      // Act
      await service.execute(command);

      // Assert
      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.email.value).toBe('test@example.com');
      expect(savedUser.firstName).toBe('John');
      expect(savedUser.lastName).toBe('Doe');
    });

    it('should propagate phoneNumber to the User entity when provided', async () => {
      const command = new RegisterCommand(
        'test@example.com',
        'Password123!',
        'John',
        'Doe',
        true,
        '+33612345678',
      );

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(createSavedUser());
      emailTokenService.generateVerificationToken.mockResolvedValue('token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      await service.execute(command);

      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.phoneNumber).toBe('+33612345678');
    });

    it('should create user without phoneNumber when not provided', async () => {
      const command = new RegisterCommand('test@example.com', 'Password123!', 'John', 'Doe', true);

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(createSavedUser());
      emailTokenService.generateVerificationToken.mockResolvedValue('token');
      matomoService.trackUserRegistration.mockResolvedValue(undefined);

      await service.execute(command);

      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.phoneNumber).toBeNull();
    });
  });
});
