import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@database/prisma.service';
import { PrismaRefreshTokenRepository } from '@modules/auth/infrastructure/persistence/repositories/prisma-refresh-token.repository';
import { RefreshTokenRecord } from '@modules/auth/infrastructure/core/domain/repositories/refresh-token.repository.interface';

const mockRefreshTokenRecord: RefreshTokenRecord = {
  id: 'token-id-1',
  token: 'raw-refresh-token',
  userId: 'user-1',
  expiresAt: new Date('2026-03-01'),
  revokedAt: null,
  createdAt: new Date('2026-02-16'),
};

const mockPrisma = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('PrismaRefreshTokenRepository', () => {
  let repository: PrismaRefreshTokenRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaRefreshTokenRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<PrismaRefreshTokenRepository>(PrismaRefreshTokenRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should call prisma.refreshToken.create with the correct data', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshTokenRecord);

      const token = 'raw-refresh-token';
      const userId = 'user-1';
      const expiresAt = new Date('2026-03-01');

      await repository.save(token, userId, expiresAt);

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: { token, userId, expiresAt },
      });
    });

    it('should return void', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshTokenRecord);

      const result = await repository.save('token', 'user-1', new Date());

      expect(result).toBeUndefined();
    });
  });

  describe('findByToken', () => {
    it('should return a RefreshTokenRecord when token is found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockRefreshTokenRecord);

      const result = await repository.findByToken('raw-refresh-token');

      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'raw-refresh-token' },
      });
      expect(result).toEqual(mockRefreshTokenRecord);
    });

    it('should return null when token is not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      const result = await repository.findByToken('nonexistent-token');

      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'nonexistent-token' },
      });
      expect(result).toBeNull();
    });
  });

  describe('revoke', () => {
    it('should call prisma.refreshToken.update with revokedAt set', async () => {
      const revokedRecord = { ...mockRefreshTokenRecord, revokedAt: new Date() };
      mockPrisma.refreshToken.update.mockResolvedValue(revokedRecord);

      const before = new Date();
      await repository.revoke('token-id-1');
      const after = new Date();

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledTimes(1);

      const call = mockPrisma.refreshToken.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'token-id-1' });
      expect(call.data.revokedAt).toBeInstanceOf(Date);
      expect(call.data.revokedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(call.data.revokedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should return void', async () => {
      mockPrisma.refreshToken.update.mockResolvedValue({
        ...mockRefreshTokenRecord,
        revokedAt: new Date(),
      });

      const result = await repository.revoke('token-id-1');

      expect(result).toBeUndefined();
    });
  });

  describe('revokeAllByUserId', () => {
    it('should call prisma.refreshToken.updateMany with correct where clause and revokedAt', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      const before = new Date();
      await repository.revokeAllByUserId('user-1');
      const after = new Date();

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);

      const call = mockPrisma.refreshToken.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ userId: 'user-1', revokedAt: null });
      expect(call.data.revokedAt).toBeInstanceOf(Date);
      expect(call.data.revokedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(call.data.revokedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should return void', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.revokeAllByUserId('user-1');

      expect(result).toBeUndefined();
    });
  });
});
