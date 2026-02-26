import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from '@modules/auth/core/application/commands/refresh-token/refresh-token.service';
import { RefreshTokenCommand } from '@modules/auth/core/application/commands/refresh-token/refresh-token.command';
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
import { InvalidRefreshTokenException } from '@modules/auth/core/application/exceptions/invalid-refresh-token.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

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

  const storedToken = {
    id: 'token-id-1',
    token: 'valid-refresh-token',
    userId: 'user-123',
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
    revokedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: REFRESH_TOKEN_REPOSITORY,
          useValue: {
            findByToken: jest.fn(),
            save: jest.fn(),
            revoke: jest.fn(),
            revokeAllByUserId: jest.fn(),
          },
        },
        {
          provide: USER_REPOSITORY,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        { provide: MatomoService, useValue: { trackTokenRefresh: jest.fn() } },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    refreshTokenRepository = module.get(REFRESH_TOKEN_REPOSITORY);
    userRepository = module.get(USER_REPOSITORY);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should successfully refresh tokens with a valid refresh token', async () => {
      // Arrange
      const command = new RefreshTokenCommand('valid-refresh-token');
      const mockUser = createMockUser();

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123', email: 'test@example.com' });
      refreshTokenRepository.findByToken.mockResolvedValue(storedToken);
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenRepository.revoke.mockResolvedValue(undefined);
      jwtService.signAsync.mockResolvedValueOnce('new-access-token');
      jwtService.signAsync.mockResolvedValueOnce('new-refresh-token');
      refreshTokenRepository.save.mockResolvedValue(undefined);
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, string> = {
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return key in config ? config[key] : defaultValue;
      });

      // Act
      const result = await service.execute(command);

      // Assert
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      });
      expect(refreshTokenRepository.findByToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('token-id-1');
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        'new-refresh-token',
        'user-123',
        expect.any(Date),
      );
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: '15m',
      });
    });

    it('should throw InvalidRefreshTokenException when JWT verification fails', async () => {
      // Arrange
      const command = new RefreshTokenCommand('invalid-jwt');
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      // Act & Assert
      await expect(service.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
      expect(refreshTokenRepository.findByToken).not.toHaveBeenCalled();
    });

    it('should throw InvalidRefreshTokenException when token not found in DB', async () => {
      // Arrange
      const command = new RefreshTokenCommand('valid-but-not-in-db');
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123', email: 'test@example.com' });
      refreshTokenRepository.findByToken.mockResolvedValue(null);
      configService.get.mockReturnValue('test-value');

      // Act & Assert
      await expect(service.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw InvalidRefreshTokenException when token is revoked', async () => {
      // Arrange
      const command = new RefreshTokenCommand('revoked-token');
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123', email: 'test@example.com' });
      refreshTokenRepository.findByToken.mockResolvedValue({
        ...storedToken,
        token: 'revoked-token',
        revokedAt: new Date(),
      });
      configService.get.mockReturnValue('test-value');

      // Act & Assert
      await expect(service.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    });

    it('should throw InvalidRefreshTokenException when user no longer exists', async () => {
      // Arrange
      const command = new RefreshTokenCommand('valid-refresh-token');
      jwtService.verifyAsync.mockResolvedValue({ sub: 'deleted-user', email: 'test@example.com' });
      refreshTokenRepository.findByToken.mockResolvedValue({
        ...storedToken,
        userId: 'deleted-user',
      });
      userRepository.findById.mockResolvedValue(null);
      configService.get.mockReturnValue('test-value');

      // Act & Assert
      await expect(service.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    });

    it('should revoke old token before issuing new one (rotation)', async () => {
      // Arrange
      const command = new RefreshTokenCommand('valid-refresh-token');
      const mockUser = createMockUser();
      const callOrder: string[] = [];

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123', email: 'test@example.com' });
      refreshTokenRepository.findByToken.mockResolvedValue(storedToken);
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenRepository.revoke.mockImplementation(async () => {
        callOrder.push('revoke');
      });
      jwtService.signAsync.mockResolvedValue('new-token');
      refreshTokenRepository.save.mockImplementation(async () => {
        callOrder.push('save');
      });
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, string> = {
          'jwt.secret': 's',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'rs',
          'jwt.refreshExpiresIn': '7d',
        };
        return key in config ? config[key] : defaultValue;
      });

      // Act
      await service.execute(command);

      // Assert — revoke before save
      expect(callOrder).toEqual(['revoke', 'save']);
    });
  });
});
