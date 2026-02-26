import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConfirmEmailChangeService } from '@modules/auth/core/application/commands/confirm-email-change/confirm-email-change.service';
import { ConfirmEmailChangeCommand } from '@modules/auth/core/application/commands/confirm-email-change/confirm-email-change.command';
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
import { InvalidResetTokenException } from '@modules/auth/core/application/exceptions/invalid-reset-token.exception';
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';

describe('ConfirmEmailChangeService', () => {
  let service: ConfirmEmailChangeService;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let eventBus: jest.Mocked<EventBus>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = new User({
    id: 'user-1',
    email: new Email('old@example.com'),
    password: HashedPassword.fromHash('$2b$10$oldhash'),
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const validPayload = { sub: 'user-1', newEmail: 'new@example.com', type: 'email-change' };

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {
      findById: jest.fn(),
      existsByEmail: jest.fn(),
      update: jest.fn(),
    };

    const mockRefreshTokenRepository: Partial<IRefreshTokenRepository> = {
      revokeAllByUserId: jest.fn(),
    };

    const mockEventBus: Partial<EventBus> = {
      publish: jest.fn(),
    };

    const mockJwtService: Partial<JwtService> = {
      verifyAsync: jest.fn(),
    };

    const mockConfigService: Partial<ConfigService> = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = { 'jwt.resetSecret': 'reset-secret' };
        return key in config ? config[key] : defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmEmailChangeService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: mockRefreshTokenRepository },
        { provide: EventBus, useValue: mockEventBus },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ConfirmEmailChangeService>(ConfirmEmailChangeService);
    userRepository = module.get(USER_REPOSITORY);
    refreshTokenRepository = module.get(REFRESH_TOKEN_REPOSITORY);
    eventBus = module.get(EventBus);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    describe('successful email change', () => {
      beforeEach(() => {
        jwtService.verifyAsync.mockResolvedValue(validPayload);
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.existsByEmail.mockResolvedValue(false);
        userRepository.update.mockResolvedValue(mockUser);
        refreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);
      });

      it('should call changeEmail on the user entity', async () => {
        // Arrange
        const changeEmailSpy = jest.spyOn(mockUser, 'changeEmail');

        // Act
        await service.execute(new ConfirmEmailChangeCommand('valid-token'));

        // Assert
        expect(changeEmailSpy).toHaveBeenCalledWith(
          expect.objectContaining({ value: 'new@example.com' }),
        );
      });

      it('should update the user in the repository', async () => {
        // Act
        await service.execute(new ConfirmEmailChangeCommand('valid-token'));

        // Assert
        expect(userRepository.update).toHaveBeenCalledWith(mockUser);
      });

      it('should revoke all refresh tokens after email change', async () => {
        // Act
        await service.execute(new ConfirmEmailChangeCommand('valid-token'));

        // Assert
        expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('user-1');
      });

      it('should return void', async () => {
        // Act
        const result = await service.execute(new ConfirmEmailChangeCommand('valid-token'));

        // Assert
        expect(result).toBeUndefined();
      });

      it('should use jwt.resetSecret for token verification', async () => {
        // Act
        await service.execute(new ConfirmEmailChangeCommand('valid-token'));

        // Assert
        expect(jwtService.verifyAsync).toHaveBeenCalledWith(
          'valid-token',
          expect.objectContaining({ secret: 'reset-secret' }),
        );
      });
    });

    describe('invalid token', () => {
      it('should throw InvalidResetTokenException when JWT verification fails', async () => {
        // Arrange
        jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

        // Act & Assert
        await expect(service.execute(new ConfirmEmailChangeCommand('bad-token'))).rejects.toThrow(
          InvalidResetTokenException,
        );
        expect(userRepository.findById).not.toHaveBeenCalled();
      });

      it('should throw InvalidResetTokenException when token type is not email-change', async () => {
        // Arrange
        jwtService.verifyAsync.mockResolvedValue({
          sub: 'user-1',
          newEmail: 'new@example.com',
          type: 'password-reset',
        });

        // Act & Assert
        await expect(
          service.execute(new ConfirmEmailChangeCommand('wrong-type-token')),
        ).rejects.toThrow(InvalidResetTokenException);
        expect(userRepository.findById).not.toHaveBeenCalled();
      });

      it('should throw InvalidResetTokenException when user is not found', async () => {
        // Arrange
        jwtService.verifyAsync.mockResolvedValue(validPayload);
        userRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.execute(new ConfirmEmailChangeCommand('valid-token'))).rejects.toThrow(
          InvalidResetTokenException,
        );
        expect(userRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('email conflict', () => {
      it('should throw EmailAlreadyExistsException when email is already taken (race condition)', async () => {
        // Arrange
        jwtService.verifyAsync.mockResolvedValue(validPayload);
        userRepository.findById.mockResolvedValue(mockUser);
        userRepository.existsByEmail.mockResolvedValue(true);

        // Act & Assert
        await expect(service.execute(new ConfirmEmailChangeCommand('valid-token'))).rejects.toThrow(
          EmailAlreadyExistsException,
        );
        expect(userRepository.update).not.toHaveBeenCalled();
        expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
      });
    });
  });
});
