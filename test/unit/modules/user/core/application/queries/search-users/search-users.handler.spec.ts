import { Test, TestingModule } from '@nestjs/testing';
import { SearchUsersHandler } from '@modules/user/core/application/queries/search-users/search-users.handler';
import { SearchUsersQuery } from '@modules/user/core/application/queries/search-users/search-users.query';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';

describe('SearchUsersHandler', () => {
  let handler: SearchUsersHandler;
  let userRepository: jest.Mocked<IUserRepository>;

  const mockUsers: User[] = [
    new User({
      id: '1',
      email: new Email('jean.dupont@example.com'),
      password: HashedPassword.fromHash('hashed1'),
      firstName: 'Jean',
      lastName: 'Dupont',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }),
    new User({
      id: '2',
      email: new Email('jeanne.martin@example.com'),
      password: HashedPassword.fromHash('hashed2'),
      firstName: 'Jeanne',
      lastName: 'Martin',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    }),
  ];

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {
      searchByName: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchUsersHandler,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    handler = module.get<SearchUsersHandler>(SearchUsersHandler);
    userRepository = module.get(USER_REPOSITORY);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return matching users as DTOs', async () => {
      // Arrange
      const query = new SearchUsersQuery('jean', 10);
      userRepository.searchByName.mockResolvedValue(mockUsers);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(userRepository.searchByName).toHaveBeenCalledWith('jean', 10);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[0].firstName).toBe('Jean');
      expect(result[1].id).toBe('2');
      expect(result[1].firstName).toBe('Jeanne');
    });

    it('should return empty array when no matches', async () => {
      // Arrange
      const query = new SearchUsersQuery('zzz', 10);
      userRepository.searchByName.mockResolvedValue([]);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should pass limit to repository', async () => {
      // Arrange
      const query = new SearchUsersQuery('jean', 5);
      userRepository.searchByName.mockResolvedValue([mockUsers[0]]);

      // Act
      await handler.execute(query);

      // Assert
      expect(userRepository.searchByName).toHaveBeenCalledWith('jean', 5);
    });

    it('should use default limit of 10', () => {
      const query = new SearchUsersQuery('jean');
      expect(query.limit).toBe(10);
    });
  });
});
