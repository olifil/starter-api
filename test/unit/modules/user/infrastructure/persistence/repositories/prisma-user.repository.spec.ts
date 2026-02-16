import { Test, TestingModule } from '@nestjs/testing';
import { PrismaUserRepository } from '@modules/user/infrastructure/persistence/repositories/prisma-user.repository';
import { PrismaService } from '@database/prisma.service';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { User as PrismaUser, Role } from '@prisma/client';

type MockPrismaUserModel = {
  create: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
};

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prismaService: { user: MockPrismaUserModel };

  const mockPrismaUser: PrismaUser = {
    id: '123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: Role.AUTHENTICATED_USER,
    emailVerified: false,
    emailVerifiedAt: null,
    bio: null,
    avatarUrl: null,
    phoneNumber: null,
    lastLoginAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  const createMockDomainUser = (): User => {
    return new User({
      id: '123',
      email: new Email('test@example.com'),
      password: HashedPassword.fromHash('hashed-password'),
      firstName: 'John',
      lastName: 'Doe',
      role: Role.AUTHENTICATED_USER,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    });
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaUserRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaUserRepository>(PrismaUserRepository);
    prismaService = module.get(PrismaService);
  });

  describe('save', () => {
    it('should create and return a user', async () => {
      // Arrange
      const domainUser = createMockDomainUser();
      prismaService.user.create.mockResolvedValue(mockPrismaUser);

      // Act
      const result = await repository.save(domainUser);

      // Assert
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: domainUser.id,
          email: domainUser.email.value,
          passwordHash: domainUser.password.hash,
          firstName: domainUser.firstName,
          lastName: domainUser.lastName,
        }),
      });
      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe('123');
      expect(result.email.value).toBe('test@example.com');
    });

    it('should map domain user to prisma format correctly', async () => {
      // Arrange
      const domainUser = createMockDomainUser();
      prismaService.user.create.mockResolvedValue(mockPrismaUser);

      // Act
      await repository.save(domainUser);

      // Assert
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          id: '123',
          email: 'test@example.com',
          passwordHash: 'hashed-password',
          firstName: 'John',
          lastName: 'Doe',
          role: Role.AUTHENTICATED_USER,
          emailVerified: false,
          emailVerifiedAt: null,
          bio: null,
          avatarUrl: null,
          phoneNumber: null,
          lastLoginAt: null,
        },
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      const domainUser = createMockDomainUser();
      const error = new Error('Database error');
      prismaService.user.create.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.save(domainUser)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find and return user by id', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockPrismaUser);

      // Act
      const result = await repository.findById('123');

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(result).toBeInstanceOf(User);
      expect(result?.id).toBe('123');
    });

    it('should return null when user not found', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should map prisma user to domain correctly', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockPrismaUser);

      // Act
      const result = await repository.findById('123');

      // Assert
      expect(result?.id).toBe('123');
      expect(result?.email.value).toBe('test@example.com');
      expect(result?.firstName).toBe('John');
      expect(result?.lastName).toBe('Doe');
      expect(result?.fullName).toBe('John Doe');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Arrange
      const email = new Email('test@example.com');
      prismaService.user.findUnique.mockResolvedValue(mockPrismaUser);

      // Act
      const result = await repository.findByEmail(email);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toBeInstanceOf(User);
      expect(result?.email.value).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      // Arrange
      const email = new Email('nonexistent@example.com');
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findByEmail(email);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return user', async () => {
      // Arrange
      const domainUser = createMockDomainUser();
      const updatedPrismaUser = { ...mockPrismaUser, firstName: 'Jane' };
      prismaService.user.update.mockResolvedValue(updatedPrismaUser);

      // Act
      const result = await repository.update(domainUser);

      // Assert
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: expect.objectContaining({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
      });
      expect(result).toBeInstanceOf(User);
    });

    it('should map updated domain user correctly', async () => {
      // Arrange
      const domainUser = createMockDomainUser();
      domainUser.updateProfile('Jane', 'Smith');
      prismaService.user.update.mockResolvedValue({
        ...mockPrismaUser,
        firstName: 'Jane',
        lastName: 'Smith',
      });

      // Act
      await repository.update(domainUser);

      // Assert
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
        }),
      });
    });
  });

  describe('delete', () => {
    it('should delete user by id', async () => {
      // Arrange
      prismaService.user.delete.mockResolvedValue(mockPrismaUser);

      // Act
      await repository.delete('123');

      // Assert
      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const error = new Error('User not found');
      prismaService.user.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.delete('non-existent')).rejects.toThrow('User not found');
    });
  });

  describe('existsByEmail', () => {
    it('should return true when email exists', async () => {
      // Arrange
      const email = new Email('test@example.com');
      prismaService.user.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByEmail(email);

      // Assert
      expect(prismaService.user.count).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      // Arrange
      const email = new Email('nonexistent@example.com');
      prismaService.user.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsByEmail(email);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      // Arrange
      const mockUsers = [mockPrismaUser, { ...mockPrismaUser, id: '456' }];
      prismaService.user.findMany.mockResolvedValue(mockUsers);
      prismaService.user.count.mockResolvedValue(15);

      // Act
      const result = await repository.findAll(1, 10);

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(prismaService.user.count).toHaveBeenCalled();
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(15);
      expect(result.users[0]).toBeInstanceOf(User);
    });

    it('should calculate skip correctly for different pages', async () => {
      // Arrange
      prismaService.user.findMany.mockResolvedValue([]);
      prismaService.user.count.mockResolvedValue(0);

      // Act
      await repository.findAll(3, 10);

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle custom page size', async () => {
      // Arrange
      prismaService.user.findMany.mockResolvedValue([]);
      prismaService.user.count.mockResolvedValue(0);

      // Act
      await repository.findAll(2, 25);

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: 25,
        take: 25,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no users', async () => {
      // Arrange
      prismaService.user.findMany.mockResolvedValue([]);
      prismaService.user.count.mockResolvedValue(0);

      // Act
      const result = await repository.findAll(1, 10);

      // Assert
      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('searchByName', () => {
    it('should search users by firstName, lastName or email', async () => {
      // Arrange
      const mockUsers = [mockPrismaUser];
      prismaService.user.findMany.mockResolvedValue(mockUsers);

      // Act
      const result = await repository.searchByName('john', 10);

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { firstName: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(User);
    });

    it('should respect limit parameter', async () => {
      // Arrange
      prismaService.user.findMany.mockResolvedValue([]);

      // Act
      await repository.searchByName('test', 5);

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('should return empty array when no matches', async () => {
      // Arrange
      prismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.searchByName('zzz', 10);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('domain to prisma mapping', () => {
    it('should handle null values in firstName', async () => {
      // Arrange
      const prismaUserWithNullName = {
        ...mockPrismaUser,
        firstName: null,
        lastName: null,
      };
      prismaService.user.findUnique.mockResolvedValue(prismaUserWithNullName);

      // Act
      const result = await repository.findById('123');

      // Assert
      expect(result?.firstName).toBe('');
      expect(result?.lastName).toBe('');
    });
  });
});
