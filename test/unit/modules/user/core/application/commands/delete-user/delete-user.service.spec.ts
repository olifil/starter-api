import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { DeleteUserService } from '@modules/user/core/application/commands/delete-user/delete-user.service';
import { DeleteUserCommand } from '@modules/user/core/application/commands/delete-user/delete-user.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { UserNotFoundException } from '@modules/user/core/application/exceptions/user-not-found.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

describe('DeleteUserService', () => {
  let service: DeleteUserService;
  let userRepository: jest.Mocked<IUserRepository>;
  let eventBus: jest.Mocked<EventBus>;

  const mockUser = new User({
    id: '123',
    email: new Email('test@example.com'),
    password: HashedPassword.fromHash('hashed-password'),
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {
      findById: jest.fn(),
      delete: jest.fn(),
    };

    const mockEventBus: Partial<EventBus> = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserService,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        { provide: MatomoService, useValue: { trackUserDeleted: jest.fn() } },
      ],
    }).compile();

    service = module.get<DeleteUserService>(DeleteUserService);
    userRepository = module.get(USER_REPOSITORY);
    eventBus = module.get(EventBus);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should delete user successfully', async () => {
      // Arrange
      const command = new DeleteUserCommand('123');

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.delete.mockResolvedValue(undefined);

      // Act
      await service.execute(command);

      // Assert
      expect(userRepository.findById).toHaveBeenCalledWith('123');
      expect(userRepository.delete).toHaveBeenCalledWith('123');
    });

    it('should throw UserNotFoundException when user does not exist', async () => {
      // Arrange
      const command = new DeleteUserCommand('non-existent-id');

      userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute(command)).rejects.toThrow(UserNotFoundException);
      expect(userRepository.delete).not.toHaveBeenCalled();
    });

    it('should publish UserDeletedEvent with email and firstName before deletion', async () => {
      // Arrange
      const command = new DeleteUserCommand('123');
      const callOrder: string[] = [];

      userRepository.findById.mockResolvedValue(mockUser);
      eventBus.publish.mockImplementation(() => {
        callOrder.push('publish');
        return undefined;
      });
      userRepository.delete.mockImplementation(async () => {
        callOrder.push('delete');
      });

      // Act
      await service.execute(command);

      // Assert — event contient email et firstName
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
          email: 'test@example.com',
          firstName: 'John',
        }),
      );

      // Assert — event publié AVANT la suppression
      expect(callOrder).toEqual(['publish', 'delete']);
    });

    it('should verify user exists before attempting deletion', async () => {
      // Arrange
      const command = new DeleteUserCommand('123');

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.delete.mockResolvedValue(undefined);

      // Act
      await service.execute(command);

      // Assert
      // Verify both methods were called
      expect(userRepository.findById).toHaveBeenCalledWith('123');
      expect(userRepository.delete).toHaveBeenCalledWith('123');
    });

    it('should return void on successful deletion', async () => {
      // Arrange
      const command = new DeleteUserCommand('123');

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await service.execute(command);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
