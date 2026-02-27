import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { UpdateMeService } from '@modules/auth/core/application/commands/update-me/update-me.service';
import { UpdateMeCommand } from '@modules/auth/core/application/commands/update-me/update-me.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '@modules/auth/core/domain/repositories/refresh-token.repository.interface';
import { EmailTokenService } from '@modules/auth/core/application/services/email-token.service';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { UserNotFoundException } from '@modules/user/core/application/exceptions/user-not-found.exception';
import { InvalidCurrentPasswordException } from '@modules/auth/core/application/exceptions/invalid-current-password.exception';
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';
import { EmailChangeRequestedEvent } from '@modules/auth/core/domain/events/email-change-requested.event';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

describe('UpdateMeService', () => {
  let service: UpdateMeService;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let emailTokenService: jest.Mocked<EmailTokenService>;
  let eventBus: jest.Mocked<EventBus>;
  let matomoService: jest.Mocked<MatomoService>;

  let mockUser: User;

  const createMockUser = (): User =>
    new User({
      id: 'user-1',
      email: new Email('john@example.com'),
      password: HashedPassword.fromHash('$2b$10$oldhash'),
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  beforeEach(async () => {
    mockUser = createMockUser();

    const mockUserRepository: Partial<IUserRepository> = {
      findById: jest.fn(),
      update: jest.fn(),
      existsByEmail: jest.fn(),
    };

    const mockRefreshTokenRepository: Partial<IRefreshTokenRepository> = {
      revokeAllByUserId: jest.fn(),
    };

    const mockEmailTokenService = {
      generateEmailChangeToken: jest.fn(),
    };

    const mockEventBus: Partial<EventBus> = {
      publish: jest.fn(),
    };

    const mockMatomoService: Partial<MatomoService> = {
      trackUserProfileUpdated: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateMeService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: mockRefreshTokenRepository },
        { provide: EmailTokenService, useValue: mockEmailTokenService },
        { provide: EventBus, useValue: mockEventBus },
        { provide: MatomoService, useValue: mockMatomoService },
      ],
    }).compile();

    service = module.get<UpdateMeService>(UpdateMeService);
    userRepository = module.get(USER_REPOSITORY);
    refreshTokenRepository = module.get(REFRESH_TOKEN_REPOSITORY);
    emailTokenService = module.get(EmailTokenService);
    eventBus = module.get(EventBus);
    matomoService = module.get(MatomoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    describe('user not found', () => {
      it('should throw UserNotFoundException when user does not exist', async () => {
        // Arrange
        const command = new UpdateMeCommand('user-1', 'Jane');
        userRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.execute(command)).rejects.toThrow(UserNotFoundException);
        expect(userRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('name update', () => {
      it('should update firstName and lastName without requiring currentPassword', async () => {
        // Arrange
        const command = new UpdateMeCommand('user-1', 'Jane', 'Smith');
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.update.mockResolvedValue(mockUser);

        // Act
        const result = await service.execute(command);

        // Assert
        expect(userRepository.findById).toHaveBeenCalledWith('user-1');
        expect(userRepository.update).toHaveBeenCalledWith(mockUser);
        expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should update only firstName', async () => {
        // Arrange
        const command = new UpdateMeCommand('user-1', 'Jane', undefined);
        const updateProfileSpy = jest.spyOn(mockUser, 'updateProfile');
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.update.mockResolvedValue(mockUser);

        // Act
        await service.execute(command);

        // Assert
        expect(updateProfileSpy).toHaveBeenCalledWith('Jane', 'Doe');
      });

      it('should update only lastName', async () => {
        // Arrange
        const command = new UpdateMeCommand('user-1', undefined, 'Smith');
        const updateProfileSpy = jest.spyOn(mockUser, 'updateProfile');
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.update.mockResolvedValue(mockUser);

        // Act
        await service.execute(command);

        // Assert
        expect(updateProfileSpy).toHaveBeenCalledWith('John', 'Smith');
      });

      it('should NOT call updateProfile when neither firstName nor lastName is provided', async () => {
        // Arrange
        const command = new UpdateMeCommand('user-1');
        const updateProfileSpy = jest.spyOn(mockUser, 'updateProfile');
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.update.mockResolvedValue(mockUser);

        // Act
        await service.execute(command);

        // Assert
        expect(updateProfileSpy).not.toHaveBeenCalled();
      });
    });

    describe('password change', () => {
      it('should change password when currentPassword is valid', async () => {
        // Arrange
        const command = new UpdateMeCommand(
          'user-1',
          undefined,
          undefined,
          undefined,
          'OldPassword1!',
          'NewPassword1!',
        );
        jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(true);
        const changePasswordSpy = jest.spyOn(mockUser, 'changePassword');
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.update.mockResolvedValue(mockUser);
        refreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);

        // Act
        await service.execute(command);

        // Assert
        expect(changePasswordSpy).toHaveBeenCalledWith(expect.any(HashedPassword));
        expect(userRepository.update).toHaveBeenCalled();
        expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('user-1');
      });

      it('should throw InvalidCurrentPasswordException when currentPassword is wrong', async () => {
        // Arrange
        const command = new UpdateMeCommand(
          'user-1',
          undefined,
          undefined,
          undefined,
          'WrongPassword1!',
          'NewPassword1!',
        );
        jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(false);
        userRepository.findById.mockResolvedValue(mockUser);

        // Act & Assert
        await expect(service.execute(command)).rejects.toThrow(InvalidCurrentPasswordException);
        expect(userRepository.update).not.toHaveBeenCalled();
        expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
      });

      it('should hash the new password before saving', async () => {
        // Arrange
        const command = new UpdateMeCommand(
          'user-1',
          undefined,
          undefined,
          undefined,
          'OldPassword1!',
          'NewPassword1!',
        );
        jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(true);
        const changePasswordSpy = jest.spyOn(mockUser, 'changePassword');
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.update.mockResolvedValue(mockUser);
        refreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);

        // Act
        await service.execute(command);

        // Assert — vérifie que le hash bcrypt est bien formaté
        const hashedPassword = changePasswordSpy.mock.calls[0][0];
        expect(hashedPassword.hash).toMatch(/^\$2[aby]\$/);
      });

      it('should revoke all refresh tokens after password change', async () => {
        // Arrange
        const command = new UpdateMeCommand(
          'user-1',
          undefined,
          undefined,
          undefined,
          'OldPassword1!',
          'NewPassword1!',
        );
        jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(true);
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.update.mockResolvedValue(mockUser);
        refreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);

        // Act
        await service.execute(command);

        // Assert
        expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('user-1');
      });
    });

    describe('email change initiation', () => {
      it('should generate a token via EmailTokenService and publish EmailChangeRequestedEvent', async () => {
        // Arrange
        const command = new UpdateMeCommand(
          'user-1',
          undefined,
          undefined,
          'new@example.com',
          'OldPassword1!',
        );
        jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(true);
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.existsByEmail.mockResolvedValue(false);
        userRepository.update.mockResolvedValue(mockUser);
        emailTokenService.generateEmailChangeToken.mockResolvedValue({
          token: 'email-change-token',
          expiresIn: '1h',
        });

        // Act
        await service.execute(command);

        // Assert
        expect(emailTokenService.generateEmailChangeToken).toHaveBeenCalledWith(
          'user-1',
          'new@example.com',
        );
        expect(eventBus.publish).toHaveBeenCalledWith(expect.any(EmailChangeRequestedEvent));
      });

      it('should publish EmailChangeRequestedEvent with correct data', async () => {
        // Arrange
        const command = new UpdateMeCommand(
          'user-1',
          undefined,
          undefined,
          'new@example.com',
          'OldPassword1!',
        );
        jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(true);
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.existsByEmail.mockResolvedValue(false);
        userRepository.update.mockResolvedValue(mockUser);
        emailTokenService.generateEmailChangeToken.mockResolvedValue({
          token: 'email-change-token',
          expiresIn: '1h',
        });

        // Act
        await service.execute(command);

        // Assert
        const event = eventBus.publish.mock.calls[0][0] as EmailChangeRequestedEvent;
        expect(event.userId).toBe('user-1');
        expect(event.firstName).toBe('John');
        expect(event.newEmail).toBe('new@example.com');
        expect(event.confirmationToken).toBe('email-change-token');
        expect(event.expiresIn).toBe('1h');
      });

      it('should NOT change email immediately in the database', async () => {
        // Arrange
        const command = new UpdateMeCommand(
          'user-1',
          undefined,
          undefined,
          'new@example.com',
          'OldPassword1!',
        );
        jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(true);
        const changeEmailSpy = jest.spyOn(mockUser, 'changeEmail');
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.existsByEmail.mockResolvedValue(false);
        userRepository.update.mockResolvedValue(mockUser);
        emailTokenService.generateEmailChangeToken.mockResolvedValue({
          token: 'email-change-token',
          expiresIn: '1h',
        });

        // Act
        await service.execute(command);

        // Assert
        expect(changeEmailSpy).not.toHaveBeenCalled();
      });

      it('should NOT revoke tokens when only email change is initiated', async () => {
        // Arrange
        const command = new UpdateMeCommand(
          'user-1',
          undefined,
          undefined,
          'new@example.com',
          'OldPassword1!',
        );
        jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(true);
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.existsByEmail.mockResolvedValue(false);
        userRepository.update.mockResolvedValue(mockUser);
        emailTokenService.generateEmailChangeToken.mockResolvedValue({
          token: 'email-change-token',
          expiresIn: '1h',
        });

        // Act
        await service.execute(command);

        // Assert
        expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
      });

      it('should throw EmailAlreadyExistsException when new email is already taken', async () => {
        // Arrange
        const command = new UpdateMeCommand(
          'user-1',
          undefined,
          undefined,
          'taken@example.com',
          'OldPassword1!',
        );
        jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(true);
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.existsByEmail.mockResolvedValue(true);

        // Act & Assert
        await expect(service.execute(command)).rejects.toThrow(EmailAlreadyExistsException);
        expect(eventBus.publish).not.toHaveBeenCalled();
        expect(userRepository.update).not.toHaveBeenCalled();
      });

      it('should throw InvalidCurrentPasswordException when currentPassword is wrong for email change', async () => {
        // Arrange
        const command = new UpdateMeCommand(
          'user-1',
          undefined,
          undefined,
          'new@example.com',
          'WrongPassword1!',
        );
        jest.spyOn(mockUser, 'verifyPassword').mockResolvedValue(false);
        userRepository.findById.mockResolvedValue(mockUser);

        // Act & Assert
        await expect(service.execute(command)).rejects.toThrow(InvalidCurrentPasswordException);
      });
    });

    describe('matomo tracking', () => {
      it('should track user profile update after successful update', async () => {
        // Arrange
        const command = new UpdateMeCommand('user-1', 'Jane', 'Smith');
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.update.mockResolvedValue(mockUser);

        // Act
        await service.execute(command);

        // Assert
        expect(matomoService.trackUserProfileUpdated).toHaveBeenCalledWith('user-1');
      });
    });
  });
});
