import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from '@modules/auth/interface/guards/jwt.strategy';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { Role } from '@prisma/client';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<IUserRepository>;
  let configService: jest.Mocked<ConfigService>;

  const createMockUser = (): User => {
    return new User({
      id: 'user-123',
      email: new Email('test@example.com'),
      password: HashedPassword.fromHash('hashed-password'),
      firstName: 'John',
      lastName: 'Doe',
      role: Role.AUTHENTICATED_USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {
      findById: jest.fn(),
    };

    const mockConfigService: Partial<ConfigService> = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get(USER_REPOSITORY);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user data when user is found', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };
      const mockUser = createMockUser();

      userRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: Role.AUTHENTICATED_USER,
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'unknown-user',
        email: 'test@example.com',
      };

      userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('Utilisateur non trouvé');
    });

    it('should extract userId from payload sub field', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'different-user-id',
        email: 'test@example.com',
      };
      const mockUser = new User({
        id: 'different-user-id',
        email: new Email('test@example.com'),
        password: HashedPassword.fromHash('hashed-password'),
        firstName: 'John',
        lastName: 'Doe',
        role: Role.AUTHENTICATED_USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      userRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result.userId).toBe('different-user-id');
    });

    it('should return email from user entity', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'old@example.com', // Payload might have old email
      };
      const mockUser = new User({
        id: 'user-123',
        email: new Email('new@example.com'), // User has updated email
        password: HashedPassword.fromHash('hashed-password'),
        firstName: 'John',
        lastName: 'Doe',
        role: Role.AUTHENTICATED_USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      userRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result.email).toBe('new@example.com'); // Should use current email from DB
    });
  });

  describe('constructor', () => {
    it('should use JWT secret from config', () => {
      // Assert
      expect(configService.get).toHaveBeenCalledWith('jwt.secret');
    });

    it('should use default secret when config is not set', async () => {
      // Arrange
      const mockConfigServiceWithoutSecret: Partial<ConfigService> = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: USER_REPOSITORY,
            useValue: { findById: jest.fn() },
          },
          {
            provide: ConfigService,
            useValue: mockConfigServiceWithoutSecret,
          },
        ],
      }).compile();

      const newStrategy = module.get<JwtStrategy>(JwtStrategy);

      // Assert
      expect(newStrategy).toBeDefined();
    });
  });
});
