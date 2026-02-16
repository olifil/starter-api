import { Test, TestingModule } from '@nestjs/testing';
import { GetUserHandler } from '@modules/user/core/application/queries/get-user/get-user.handler';
import { GetUserQuery } from '@modules/user/core/application/queries/get-user/get-user.query';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { UserNotFoundException } from '@modules/user/core/application/exceptions/user-not-found.exception';

describe('GetUserHandler', () => {
  let handler: GetUserHandler;
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
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserHandler,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    handler = module.get<GetUserHandler>(GetUserHandler);
    userRepository = module.get(USER_REPOSITORY);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return user profile when user exists', async () => {
      // Arrange
      const query = new GetUserQuery('123');
      userRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(userRepository.findById).toHaveBeenCalledWith('123');
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

    it('should throw UserNotFoundException when user does not exist', async () => {
      // Arrange
      const query = new GetUserQuery('non-existent-id');
      userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(UserNotFoundException);
      expect(userRepository.findById).toHaveBeenCalledWith('non-existent-id');
    });

    it('should return correct user profile structure', async () => {
      // Arrange
      const query = new GetUserQuery('123');
      userRepository.findById.mockResolvedValue(mockUser);

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
      const query = new GetUserQuery('123');
      userRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
