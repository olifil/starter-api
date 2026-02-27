import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { VerifyEmailService } from '@modules/auth/core/application/commands/verify-email/verify-email.service';
import { VerifyEmailCommand } from '@modules/auth/core/application/commands/verify-email/verify-email.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '@modules/auth/core/domain/repositories/refresh-token.repository.interface';
import { EmailTokenService } from '@modules/auth/core/application/services/email-token.service';
import { InvalidVerificationTokenException } from '@modules/auth/core/application/exceptions/invalid-verification-token.exception';
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';
import { AccountVerifiedEvent } from '@modules/auth/core/domain/events/account-verified.event';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

describe('VerifyEmailService', () => {
  let service: VerifyEmailService;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let emailTokenService: jest.Mocked<EmailTokenService>;
  let eventBus: jest.Mocked<EventBus>;

  const createMockUser = (): User =>
    new User({
      id: 'user-1',
      email: new Email('john@example.com'),
      password: HashedPassword.fromHash('hashed'),
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  beforeEach(async () => {
    const mockUserRepository: Partial<jest.Mocked<IUserRepository>> = {
      findById: jest.fn(),
      update: jest.fn(),
      existsByEmail: jest.fn(),
    };

    const mockRefreshTokenRepository: Partial<jest.Mocked<IRefreshTokenRepository>> = {
      revokeAllByUserId: jest.fn(),
    };

    const mockEmailTokenService = {
      verifyEmailToken: jest.fn(),
    };

    const mockEventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyEmailService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: mockRefreshTokenRepository },
        { provide: EmailTokenService, useValue: mockEmailTokenService },
        { provide: EventBus, useValue: mockEventBus },
        { provide: MatomoService, useValue: { trackEmailVerified: jest.fn() } },
      ],
    }).compile();

    service = module.get<VerifyEmailService>(VerifyEmailService);
    userRepository = module.get(USER_REPOSITORY);
    refreshTokenRepository = module.get(REFRESH_TOKEN_REPOSITORY);
    emailTokenService = module.get(EmailTokenService);
    eventBus = module.get(EventBus);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('email-verification branch', () => {
    it('should verify email when token is valid', async () => {
      const mockUser = createMockUser();
      emailTokenService.verifyEmailToken.mockResolvedValue({
        type: 'email-verification',
        sub: 'user-1',
        email: 'john@example.com',
      });
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      await service.execute(new VerifyEmailCommand('valid-token'));

      expect(userRepository.findById).toHaveBeenCalledWith('user-1');
      expect(userRepository.update).toHaveBeenCalledWith(mockUser);
    });

    it('should call verifyEmail() on the user entity', async () => {
      const mockUser = createMockUser();
      emailTokenService.verifyEmailToken.mockResolvedValue({
        type: 'email-verification',
        sub: 'user-1',
        email: 'john@example.com',
      });
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      const verifyEmailSpy = jest.spyOn(mockUser, 'verifyEmail');
      await service.execute(new VerifyEmailCommand('valid-token'));

      expect(verifyEmailSpy).toHaveBeenCalled();
    });

    it('should publish AccountVerifiedEvent after successful email verification', async () => {
      const mockUser = createMockUser();
      emailTokenService.verifyEmailToken.mockResolvedValue({
        type: 'email-verification',
        sub: 'user-1',
        email: 'john@example.com',
      });
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      await service.execute(new VerifyEmailCommand('valid-token'));

      expect(eventBus.publish).toHaveBeenCalledWith(expect.any(AccountVerifiedEvent));
      const event = eventBus.publish.mock.calls[0][0] as AccountVerifiedEvent;
      expect(event.userId).toBe('user-1');
      expect(event.email).toBe('john@example.com');
      expect(event.firstName).toBe('John');
    });

    it('should NOT revoke refresh tokens after email verification', async () => {
      const mockUser = createMockUser();
      emailTokenService.verifyEmailToken.mockResolvedValue({
        type: 'email-verification',
        sub: 'user-1',
        email: 'john@example.com',
      });
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      await service.execute(new VerifyEmailCommand('valid-token'));

      expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
    });

    it('should throw InvalidVerificationTokenException when user not found', async () => {
      emailTokenService.verifyEmailToken.mockResolvedValue({
        type: 'email-verification',
        sub: 'unknown-user',
        email: 'john@example.com',
      });
      userRepository.findById.mockResolvedValue(null);

      await expect(service.execute(new VerifyEmailCommand('valid-token'))).rejects.toThrow(
        InvalidVerificationTokenException,
      );
    });
  });

  describe('email-change branch', () => {
    it('should update email and revoke sessions when token is valid', async () => {
      const mockUser = createMockUser();
      emailTokenService.verifyEmailToken.mockResolvedValue({
        type: 'email-change',
        sub: 'user-1',
        newEmail: 'new@example.com',
      });
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.update.mockResolvedValue(mockUser);
      refreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);

      await service.execute(new VerifyEmailCommand('email-change-token'));

      expect(userRepository.existsByEmail).toHaveBeenCalled();
      expect(userRepository.update).toHaveBeenCalledWith(mockUser);
      expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('user-1');
    });

    it('should call changeEmail() on the user entity with the new email', async () => {
      const mockUser = createMockUser();
      emailTokenService.verifyEmailToken.mockResolvedValue({
        type: 'email-change',
        sub: 'user-1',
        newEmail: 'new@example.com',
      });
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.update.mockResolvedValue(mockUser);
      refreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);

      const changeEmailSpy = jest.spyOn(mockUser, 'changeEmail');
      await service.execute(new VerifyEmailCommand('email-change-token'));

      expect(changeEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'new@example.com' }),
      );
    });

    it('should throw EmailAlreadyExistsException when new email is already taken', async () => {
      const mockUser = createMockUser();
      emailTokenService.verifyEmailToken.mockResolvedValue({
        type: 'email-change',
        sub: 'user-1',
        newEmail: 'taken@example.com',
      });
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.existsByEmail.mockResolvedValue(true);

      await expect(service.execute(new VerifyEmailCommand('email-change-token'))).rejects.toThrow(
        EmailAlreadyExistsException,
      );
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
    });

    it('should throw when user referenced in email-change token does not exist', async () => {
      emailTokenService.verifyEmailToken.mockResolvedValue({
        type: 'email-change',
        sub: 'non-existent-user',
        newEmail: 'new@example.com',
      });
      userRepository.findById.mockResolvedValue(null);

      await expect(service.execute(new VerifyEmailCommand('email-change-token'))).rejects.toThrow();
    });
  });

  describe('invalid token', () => {
    it('should propagate InvalidVerificationTokenException from EmailTokenService', async () => {
      emailTokenService.verifyEmailToken.mockRejectedValue(new InvalidVerificationTokenException());

      await expect(service.execute(new VerifyEmailCommand('bad-token'))).rejects.toThrow(
        InvalidVerificationTokenException,
      );
    });
  });
});
