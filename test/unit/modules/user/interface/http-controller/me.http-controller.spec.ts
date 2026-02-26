import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MeHttpController } from '@modules/user/interface/http-controller/me.http-controller';
import { GetUserQuery } from '@modules/user/core/application/queries/get-user/get-user.query';
import { UpdateMeCommand } from '@modules/auth/core/application/commands/update-me/update-me.command';
import { DeleteUserCommand } from '@modules/user/core/application/commands/delete-user/delete-user.command';
import { UserProfileDto } from '@modules/user/core/application/dtos/user-profile.dto';
import { UpdateMeDto } from '@modules/user/core/application/dtos/update-me.dto';

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
        { provide: QueryBus, useValue: mockQueryBus },
        { provide: CommandBus, useValue: mockCommandBus },
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
      expect(queryBus.execute).toHaveBeenCalledWith(expect.objectContaining({ userId: '123' }));
      expect(result).toEqual(mockUserProfile);
    });

    it('should use userId from current user context', async () => {
      // Arrange
      const currentUser = { userId: 'user-456', email: 'other@example.com' };
      queryBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      await controller.getMyProfile(currentUser);

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-456' }),
      );
    });
  });

  describe('updateMe', () => {
    it('should dispatch UpdateMeCommand and return updated profile', async () => {
      // Arrange
      const dto = new UpdateMeDto();
      dto.firstName = 'Jane';
      dto.lastName = 'Smith';
      const updatedProfile = { ...mockUserProfile, firstName: 'Jane', lastName: 'Smith' };
      commandBus.execute.mockResolvedValue(updatedProfile);

      // Act
      const result = await controller.updateMe(mockCurrentUser, dto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateMeCommand));
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
          firstName: 'Jane',
          lastName: 'Smith',
        }),
      );
      expect(result).toEqual(updatedProfile);
    });

    it('should pass newEmail, newPassword and currentPassword to the command', async () => {
      // Arrange
      const dto = new UpdateMeDto();
      dto.newEmail = 'new@example.com';
      dto.newPassword = 'NewPassword1!';
      dto.currentPassword = 'OldPassword1!';
      commandBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      await controller.updateMe(mockCurrentUser, dto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
          newEmail: 'new@example.com',
          newPassword: 'NewPassword1!',
          currentPassword: 'OldPassword1!',
        }),
      );
    });

    it('should use userId from current user context', async () => {
      // Arrange
      const currentUser = { userId: 'user-789', email: 'other@example.com' };
      const dto = new UpdateMeDto();
      dto.firstName = 'Jane';
      commandBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      await controller.updateMe(currentUser, dto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-789' }),
      );
    });

    it('should pass undefined fields when dto properties are absent', async () => {
      // Arrange
      const dto = new UpdateMeDto();
      commandBus.execute.mockResolvedValue(mockUserProfile);

      // Act
      await controller.updateMe(mockCurrentUser, dto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
          firstName: undefined,
          lastName: undefined,
          newEmail: undefined,
          currentPassword: undefined,
          newPassword: undefined,
        }),
      );
    });
  });

  describe('deleteMyAccount', () => {
    it('should dispatch DeleteUserCommand for current user', async () => {
      // Arrange
      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await controller.deleteMyAccount(mockCurrentUser);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteUserCommand));
      expect(commandBus.execute).toHaveBeenCalledWith(expect.objectContaining({ userId: '123' }));
    });
  });
});
