import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserHttpController } from '@modules/user/interface/http-controller/user.http-controller';
import { GetUserQuery } from '@modules/user/core/application/queries/get-user/get-user.query';
import { GetUsersQuery } from '@modules/user/core/application/queries/get-users/get-users.query';
import { DeleteUserCommand } from '@modules/user/core/application/commands/delete-user/delete-user.command';
import { SearchUsersQuery } from '@modules/user/core/application/queries/search-users/search-users.query';
import { UserProfileDto } from '@modules/user/core/application/dtos/user-profile.dto';
import { PaginatedResponseDto } from '@modules/user/core/application/dtos/pagination.dto';
import { BadRequestException } from '@nestjs/common';

describe('UserHttpController', () => {
  let controller: UserHttpController;
  let queryBus: jest.Mocked<QueryBus>;
  let commandBus: jest.Mocked<CommandBus>;

  const mockUserProfile: UserProfileDto = {
    id: '123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  };

  const mockPaginatedResponse: PaginatedResponseDto<UserProfileDto> = {
    data: [mockUserProfile],
    meta: {
      currentPage: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(async () => {
    const mockQueryBus: Partial<QueryBus> = {
      execute: jest.fn(),
    };

    const mockCommandBus: Partial<CommandBus> = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserHttpController],
      providers: [
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    controller = module.get<UserHttpController>(UserHttpController);
    queryBus = module.get(QueryBus);
    commandBus = module.get(CommandBus);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return paginated users with default pagination', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getUsers('1', '10');

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetUsersQuery));
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 10,
        }),
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should parse page and pageSize from query params', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getUsers('2', '20');

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          pageSize: 20,
        }),
      );
    });

    it('should use default values when params are not provided', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getUsers();

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 10,
        }),
      );
    });
  });

  describe('getUser', () => {
    it('should return user profile by id', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      const result = await controller.getUser('123');

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetUserQuery));
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
        }),
      );
      expect(result).toEqual(mockUserProfile);
    });

    it('should pass correct user id to query', async () => {
      // Arrange
      const userId = 'user-456';
      queryBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      await controller.getUser(userId);

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
        }),
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user by id', async () => {
      // Arrange
      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await controller.deleteUser('123');

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteUserCommand));
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
        }),
      );
    });

    it('should pass correct user id to command', async () => {
      // Arrange
      const userId = 'user-789';
      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await controller.deleteUser(userId);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-789',
        }),
      );
    });

    it('should return void on successful deletion', async () => {
      // Arrange
      commandBus.execute.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteUser('123');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('searchUsers', () => {
    it('should return matching users', async () => {
      // Arrange
      const mockResults = [mockUserProfile];
      queryBus.execute.mockResolvedValue(mockResults);

      // Act
      const result = await controller.searchUsers('jean', '10');

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(SearchUsersQuery));
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'jean',
          limit: 10,
        }),
      );
      expect(result).toEqual(mockResults);
    });

    it('should throw BadRequestException when query is too short', async () => {
      await expect(controller.searchUsers('j', '10')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when query is empty', async () => {
      await expect(controller.searchUsers('', '10')).rejects.toThrow(BadRequestException);
    });

    it('should trim query before validation', async () => {
      await expect(controller.searchUsers('  j  ', '10')).rejects.toThrow(BadRequestException);
    });

    it('should cap limit at 20', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue([]);

      // Act
      await controller.searchUsers('jean', '50');

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
        }),
      );
    });

    it('should use default limit of 10', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue([]);

      // Act
      await controller.searchUsers('jean');

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
        }),
      );
    });

    it('should trim the search query', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue([]);

      // Act
      await controller.searchUsers('  jean  ', '10');

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'jean',
        }),
      );
    });
  });
});
