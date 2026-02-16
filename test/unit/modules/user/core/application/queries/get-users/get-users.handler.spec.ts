import { Test, TestingModule } from '@nestjs/testing';
import { GetUsersHandler } from '@modules/user/core/application/queries/get-users/get-users.handler';
import { GetUsersQuery } from '@modules/user/core/application/queries/get-users/get-users.query';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';

describe('GetUsersHandler', () => {
  let handler: GetUsersHandler;
  let userRepository: jest.Mocked<IUserRepository>;

  const mockUsers: User[] = [
    new User({
      id: '1',
      email: new Email('user1@example.com'),
      password: HashedPassword.fromHash('hashed1'),
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }),
    new User({
      id: '2',
      email: new Email('user2@example.com'),
      password: HashedPassword.fromHash('hashed2'),
      firstName: 'Jane',
      lastName: 'Smith',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    }),
  ];

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUsersHandler,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    handler = module.get<GetUsersHandler>(GetUsersHandler);
    userRepository = module.get(USER_REPOSITORY);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return paginated users with correct metadata', async () => {
      // Arrange
      const query = new GetUsersQuery(1, 10);
      userRepository.findAll.mockResolvedValue({
        users: mockUsers,
        total: 25,
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(userRepository.findAll).toHaveBeenCalledWith(1, 10);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('1');
      expect(result.data[0].email).toBe('user1@example.com');
      expect(result.data[1].id).toBe('2');
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.totalItems).toBe(25);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(false);
    });

    it('should calculate hasNextPage correctly for last page', async () => {
      // Arrange
      const query = new GetUsersQuery(3, 10);
      userRepository.findAll.mockResolvedValue({
        users: mockUsers.slice(0, 1), // Only 1 user on last page
        total: 21,
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.meta.currentPage).toBe(3);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(true);
    });

    it('should handle empty results', async () => {
      // Arrange
      const query = new GetUsersQuery(1, 10);
      userRepository.findAll.mockResolvedValue({
        users: [],
        total: 0,
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.totalPages).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);
    });

    it('should use default values from query', async () => {
      // Arrange
      const query = new GetUsersQuery(); // Uses defaults: page=1, pageSize=10
      userRepository.findAll.mockResolvedValue({
        users: mockUsers,
        total: 2,
      });

      // Act
      await handler.execute(query);

      // Assert
      expect(userRepository.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle custom page size', async () => {
      // Arrange
      const query = new GetUsersQuery(2, 5);
      userRepository.findAll.mockResolvedValue({
        users: mockUsers,
        total: 12,
      });

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(userRepository.findAll).toHaveBeenCalledWith(2, 5);
      expect(result.meta.pageSize).toBe(5);
      expect(result.meta.totalPages).toBe(3);
    });
  });
});
