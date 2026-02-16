import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MeHttpController } from '@modules/user/interface/http-controller/me.http-controller';
import { GetUserQuery } from '@modules/user/core/application/queries/get-user/get-user.query';
import { UpdateUserCommand } from '@modules/user/core/application/commands/update-user/update-user.command';
import { UserProfileDto } from '@modules/user/core/application/dtos/user-profile.dto';
import { UpdateUserDto } from '@modules/user/core/application/dtos/update-user.dto';

describe('MeHttpController', () => {
  let controller: MeHttpController;
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

  const mockCurrentUser = {
    userId: '123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const mockQueryBus: Partial<QueryBus> = {
      execute: jest.fn(),
    };

    const mockCommandBus: Partial<CommandBus> = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeHttpController],
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

    controller = module.get<MeHttpController>(MeHttpController);
    queryBus = module.get(QueryBus);
    commandBus = module.get(CommandBus);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyProfile', () => {
    it('should return current user profile', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      const result = await controller.getMyProfile(mockCurrentUser);

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetUserQuery));
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
        }),
      );
      expect(result).toEqual(mockUserProfile);
    });

    it('should use userId from current user context', async () => {
      // Arrange
      const currentUser = { userId: 'user-456' };
      queryBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      await controller.getMyProfile(currentUser);

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
        }),
      );
    });
  });

  describe('updateMyProfile', () => {
    it('should update current user profile', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };
      const updatedProfile = { ...mockUserProfile, firstName: 'Jane', lastName: 'Smith' };
      commandBus.execute.mockResolvedValue(updatedProfile);

      // Act
      const result = await controller.updateMyProfile(mockCurrentUser, updateDto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateUserCommand));
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
          firstName: 'Jane',
          lastName: 'Smith',
        }),
      );
      expect(result).toEqual(updatedProfile);
    });

    it('should use userId from current user context', async () => {
      // Arrange
      const currentUser = { userId: 'user-789' };
      const updateDto: UpdateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };
      commandBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      await controller.updateMyProfile(currentUser, updateDto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-789',
        }),
      );
    });

    it('should update only firstName when lastName is not provided', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        firstName: 'Jane',
      };
      commandBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      await controller.updateMyProfile(mockCurrentUser, updateDto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
          firstName: 'Jane',
          lastName: undefined,
        }),
      );
    });

    it('should update only lastName when firstName is not provided', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        lastName: 'Smith',
      };
      commandBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      await controller.updateMyProfile(mockCurrentUser, updateDto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
          firstName: undefined,
          lastName: 'Smith',
        }),
      );
    });

    it('should handle empty update dto', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {};
      commandBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      await controller.updateMyProfile(mockCurrentUser, updateDto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
          firstName: undefined,
          lastName: undefined,
        }),
      );
    });
  });
});
