import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { UpdateUserService } from '@modules/user/core/application/commands/update-user/update-user.service';
import { UpdateUserCommand } from '@modules/user/core/application/commands/update-user/update-user.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { UserNotFoundException } from '@modules/user/core/application/exceptions/user-not-found.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

describe('UpdateUserService', () => {
  let service: UpdateUserService;
  let userRepository: jest.Mocked<IUserRepository>;
  let eventBus: jest.Mocked<EventBus>;
  let mockUser: User;

  const createMockUser = () =>
    new User({
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
      update: jest.fn(),
    };

    const mockEventBus: Partial<EventBus> = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserService,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        { provide: MatomoService, useValue: { trackUserProfileUpdated: jest.fn() } },
      ],
    }).compile();

    service = module.get<UpdateUserService>(UpdateUserService);
    userRepository = module.get(USER_REPOSITORY);
    eventBus = module.get(EventBus);

    // Create a fresh mock user for each test
    mockUser = createMockUser();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      const command = new UpdateUserCommand('123', 'Jane', 'Smith');

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      // Act
      const result = await service.execute(command);

      // Assert
      expect(userRepository.findById).toHaveBeenCalledWith('123');
      expect(userRepository.update).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email.value,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        phoneNumber: null,
        fullName: mockUser.fullName,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
    });

    it('should throw UserNotFoundException when user does not exist', async () => {
      // Arrange
      const command = new UpdateUserCommand('non-existent-id', 'Jane', 'Smith');

      userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute(command)).rejects.toThrow(UserNotFoundException);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should update only firstName when lastName is not provided', async () => {
      // Arrange
      const command = new UpdateUserCommand('123', 'Jane', undefined);

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      // Spy on the updateProfile method
      const updateProfileSpy = jest.spyOn(mockUser, 'updateProfile');

      // Act
      await service.execute(command);

      // Assert
      expect(updateProfileSpy).toHaveBeenCalledWith('Jane', mockUser.lastName, undefined);
    });

    it('should update only lastName when firstName is not provided', async () => {
      // Arrange
      const command = new UpdateUserCommand('123', undefined, 'Smith');

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      // Spy on the updateProfile method
      const updateProfileSpy = jest.spyOn(mockUser, 'updateProfile');

      // Act
      await service.execute(command);

      // Assert
      expect(updateProfileSpy).toHaveBeenCalledWith(mockUser.firstName, 'Smith', undefined);
    });

    it('should update phoneNumber when provided', async () => {
      const command = new UpdateUserCommand('123', undefined, undefined, '+33612345678');
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);
      const updateProfileSpy = jest.spyOn(mockUser, 'updateProfile');

      await service.execute(command);

      expect(updateProfileSpy).toHaveBeenCalledWith(
        mockUser.firstName,
        mockUser.lastName,
        '+33612345678',
      );
    });

    it('should not call updateProfile when both firstName and lastName are undefined', async () => {
      // Arrange
      const command = new UpdateUserCommand('123', undefined, undefined);

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      // Spy on the updateProfile method
      const updateProfileSpy = jest.spyOn(mockUser, 'updateProfile');

      // Act
      await service.execute(command);

      // Assert
      expect(updateProfileSpy).not.toHaveBeenCalled();
      expect(userRepository.update).toHaveBeenCalled();
    });

    it('should publish domain events after user update', async () => {
      // Arrange
      const command = new UpdateUserCommand('123', 'Jane', 'Smith');

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      // Act
      await service.execute(command);

      // Assert
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should clear domain events after publishing', async () => {
      // Arrange
      const command = new UpdateUserCommand('123', 'Jane', 'Smith');

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      // Spy on clearDomainEvents
      const clearEventsSpy = jest.spyOn(mockUser, 'clearDomainEvents');

      // Act
      await service.execute(command);

      // Assert
      expect(clearEventsSpy).toHaveBeenCalled();
    });
  });
});
