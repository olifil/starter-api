import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@database/prisma.service';
import { PrismaNotificationPreferenceRepository } from '@modules/notification/infrastructure/persistence/repositories/prisma-notification-preference.repository';
import { NotificationPreference } from '@modules/notification/core/domain/entities/notification-preference.entity';

const mockPrismaPref = {
  id: 'pref-1',
  userId: 'user-1',
  channel: 'EMAIL',
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  notificationPreference: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('PrismaNotificationPreferenceRepository', () => {
  let repository: PrismaNotificationPreferenceRepository;

  const buildDomainPreference = (
    overrides: Partial<typeof mockPrismaPref> = {},
  ): NotificationPreference => {
    const data = { ...mockPrismaPref, ...overrides };
    return new NotificationPreference({
      id: data.id,
      userId: data.userId,
      channel: data.channel,
      enabled: data.enabled,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaNotificationPreferenceRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaNotificationPreferenceRepository>(
      PrismaNotificationPreferenceRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should call prisma.notificationPreference.create and return a domain entity', async () => {
      mockPrisma.notificationPreference.create.mockResolvedValue(mockPrismaPref);

      const domainPref = buildDomainPreference();
      const result = await repository.save(domainPref);

      expect(mockPrisma.notificationPreference.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notificationPreference.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          channel: 'EMAIL',
          enabled: true,
        }),
      });
      expect(result).toBeInstanceOf(NotificationPreference);
      expect(result.id).toBe('pref-1');
      expect(result.userId).toBe('user-1');
      expect(result.channel).toBe('EMAIL');
      expect(result.enabled).toBe(true);
    });
  });

  describe('findByUserId', () => {
    it('should return an array of NotificationPreference domain entities', async () => {
      const prismaPrefSms = { ...mockPrismaPref, id: 'pref-2', channel: 'SMS', enabled: false };
      mockPrisma.notificationPreference.findMany.mockResolvedValue([mockPrismaPref, prismaPrefSms]);

      const result = await repository.findByUserId('user-1');

      expect(mockPrisma.notificationPreference.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notificationPreference.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { channel: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(NotificationPreference);
      expect(result[0].channel).toBe('EMAIL');
      expect(result[1]).toBeInstanceOf(NotificationPreference);
      expect(result[1].channel).toBe('SMS');
    });

    it('should return an empty array when user has no preferences', async () => {
      mockPrisma.notificationPreference.findMany.mockResolvedValue([]);

      const result = await repository.findByUserId('user-no-prefs');

      expect(result).toHaveLength(0);
    });
  });

  describe('findByUserIdAndChannel', () => {
    it('should return a NotificationPreference when found', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(mockPrismaPref);

      const result = await repository.findByUserIdAndChannel('user-1', 'EMAIL');

      expect(mockPrisma.notificationPreference.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId_channel: { userId: 'user-1', channel: 'EMAIL' } },
      });
      expect(result).toBeInstanceOf(NotificationPreference);
      expect(result?.channel).toBe('EMAIL');
      expect(result?.enabled).toBe(true);
    });

    it('should return null when preference is not found', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await repository.findByUserIdAndChannel('user-1', 'SMS');

      expect(mockPrisma.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId_channel: { userId: 'user-1', channel: 'SMS' } },
      });
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should call prisma.notificationPreference.upsert with correct where, update, and create', async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue(mockPrismaPref);

      const domainPref = buildDomainPreference();
      const result = await repository.upsert(domainPref);

      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId_channel: { userId: 'user-1', channel: 'EMAIL' } },
        update: { enabled: true },
        create: expect.objectContaining({
          userId: 'user-1',
          channel: 'EMAIL',
          enabled: true,
        }),
      });
      expect(result).toBeInstanceOf(NotificationPreference);
      expect(result.id).toBe('pref-1');
    });

    it('should reflect updated enabled=false when upserting a disabled preference', async () => {
      const disabledPref = { ...mockPrismaPref, enabled: false };
      mockPrisma.notificationPreference.upsert.mockResolvedValue(disabledPref);

      const domainPref = buildDomainPreference({ enabled: false });
      const result = await repository.upsert(domainPref);

      const call = mockPrisma.notificationPreference.upsert.mock.calls[0][0];
      expect(call.update).toEqual({ enabled: false });
      expect(result.enabled).toBe(false);
    });
  });
});
