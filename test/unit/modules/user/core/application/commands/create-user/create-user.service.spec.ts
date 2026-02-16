import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { CreateUserService } from '@modules/user/core/application/commands/create-user/create-user.service';
import { CreateUserCommand } from '@modules/user/core/application/commands/create-user/create-user.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';

describe('CreateUserService', () => {
  let service: CreateUserService;
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
      existsByEmail: jest.fn(),
      save: jest.fn(),
    };

    const mockEventBus: Partial<EventBus> = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserService,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<CreateUserService>(CreateUserService);
    userRepository = module.get(USER_REPOSITORY);
    eventBus = module.get(EventBus);

    // Create a fresh mock user for each test
    mockUser = createMockUser();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const command = new CreateUserCommand('test@example.com', 'Password123!', 'John', 'Doe');

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(mockUser);

      // Act
      const result = await service.execute(command);

      // Assert
      expect(userRepository.existsByEmail).toHaveBeenCalledWith(expect.any(Email));
      expect(userRepository.save).toHaveBeenCalledWith(expect.any(User));
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email.value,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        fullName: mockUser.fullName,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
    });

    it('should publish domain events after user creation', async () => {
      // Arrange
      const command = new CreateUserCommand('test@example.com', 'Password123!', 'John', 'Doe');

      // Create a fresh user without id so it generates domain events
      const userWithEvents = new User({
        email: new Email('test@example.com'),
        password: HashedPassword.fromHash('hashed'),
        firstName: 'John',
        lastName: 'Doe',
      });

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(userWithEvents);

      // Act
      await service.execute(command);

      // Assert
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should throw EmailAlreadyExistsException when email already exists', async () => {
      // Arrange
      const command = new CreateUserCommand('existing@example.com', 'Password123!', 'John', 'Doe');

      userRepository.existsByEmail.mockResolvedValue(true);

      // Act & Assert
      await expect(service.execute(command)).rejects.toThrow(EmailAlreadyExistsException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should hash the password before saving', async () => {
      // Arrange
      const command = new CreateUserCommand('test@example.com', 'Password123!', 'John', 'Doe');

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockImplementation(async (user: User) => {
        // Verify the password is hashed
        expect(user.password.hash).not.toBe('Password123!');
        expect(user.password.hash).toBeTruthy();
        return mockUser;
      });

      // Act
      await service.execute(command);

      // Assert
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should create user with correct email value object', async () => {
      // Arrange
      const command = new CreateUserCommand('test@example.com', 'Password123!', 'John', 'Doe');

      userRepository.existsByEmail.mockResolvedValue(false);
      userRepository.save.mockImplementation(async (user: User) => {
        expect(user.email).toBeInstanceOf(Email);
        expect(user.email.value).toBe('test@example.com');
        return mockUser;
      });

      // Act
      await service.execute(command);

      // Assert
      expect(userRepository.save).toHaveBeenCalled();
    });
  });
});
