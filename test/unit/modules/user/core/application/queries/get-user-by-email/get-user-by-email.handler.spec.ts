import { Test, TestingModule } from '@nestjs/testing';
import { GetUserByEmailHandler } from '@modules/user/core/application/queries/get-user-by-email/get-user-by-email.handler';
import { GetUserByEmailQuery } from '@modules/user/core/application/queries/get-user-by-email/get-user-by-email.query';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';

describe('GetUserByEmailHandler', () => {
  let handler: GetUserByEmailHandler;
  let userRepository: jest.Mocked<IUserRepository>;

  const mockUser = new User({
    id: '123',
    email: new Email('test@example.com'),
    password: HashedPassword.fromHash('hashed-password'),
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  });

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {
      findByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserByEmailHandler,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    handler = module.get<GetUserByEmailHandler>(GetUserByEmailHandler);
    userRepository = module.get(USER_REPOSITORY);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return user profile when user exists', async () => {
      // Arrange
      const query = new GetUserByEmailQuery('test@example.com');
      userRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(userRepository.findByEmail).toHaveBeenCalledWith(expect.any(Email));
      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
    });

    it('should return null when user does not exist', async () => {
      // Arrange
      const query = new GetUserByEmailQuery('nonexistent@example.com');
      userRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(userRepository.findByEmail).toHaveBeenCalledWith(expect.any(Email));
      expect(result).toBeNull();
    });

    it('should create Email value object with correct email', async () => {
      // Arrange
      const query = new GetUserByEmailQuery('test@example.com');
      userRepository.findByEmail.mockImplementation(async (email: Email) => {
        expect(email).toBeInstanceOf(Email);
        expect(email.value).toBe('test@example.com');
        return mockUser;
      });

      // Act
      await handler.execute(query);

      // Assert
      expect(userRepository.findByEmail).toHaveBeenCalled();
    });

    it('should return correct user profile structure when user exists', async () => {
      // Arrange
      const query = new GetUserByEmailQuery('test@example.com');
      userRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('fullName');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should not expose password in returned DTO', async () => {
      // Arrange
      const query = new GetUserByEmailQuery('test@example.com');
      userRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should handle different email formats', async () => {
      // Arrange
      const emails = ['user@example.com', 'user.name@example.com', 'user+tag@example.co.uk'];

      for (const email of emails) {
        const query = new GetUserByEmailQuery(email);
        userRepository.findByEmail.mockResolvedValue(mockUser);

        // Act
        const result = await handler.execute(query);

        // Assert
        expect(result).toBeDefined();
      }
    });
  });
});
