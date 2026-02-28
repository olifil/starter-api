import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@database/prisma.service';
import { PrismaNotificationRepository } from '@modules/notification/infrastructure/persistence/repositories/prisma-notification.repository';
import { Notification } from '@modules/notification/core/domain/entities/notification.entity';
import { NotificationType } from '@modules/notification/core/domain/value-objects/notification-type.vo';
import { NotificationChannel } from '@modules/notification/core/domain/value-objects/notification-channel.vo';
import { NotificationStatus } from '@modules/notification/core/domain/value-objects/notification-status.vo';

const mockPrismaNotification = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'welcome',
  channel: 'EMAIL',
  status: 'PENDING',
  subject: 'Welcome',
  body: '<p>Hello</p>',
  metadata: null,
  sentAt: null,
  readAt: null,
  failedAt: null,
  failureReason: null,
  retryCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  notification: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('PrismaNotificationRepository', () => {
  let repository: PrismaNotificationRepository;

  const buildDomainNotification = (
    overrides: Partial<typeof mockPrismaNotification> = {},
  ): Notification => {
    const data = { ...mockPrismaNotification, ...overrides };
    return new Notification({
      id: data.id,
      userId: data.userId,
      type: new NotificationType(data.type),
      channel: data.channel as NotificationChannel,
      status: data.status as NotificationStatus,
      subject: data.subject ?? undefined,
      body: data.body,
      metadata: (data.metadata as unknown as Record<string, unknown>) ?? undefined,
      sentAt: data.sentAt ?? undefined,
      readAt: data.readAt ?? undefined,
      failedAt: data.failedAt ?? undefined,
      failureReason: data.failureReason ?? undefined,
      retryCount: data.retryCount,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaNotificationRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<PrismaNotificationRepository>(PrismaNotificationRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should call prisma.notification.create and return a Notification domain entity', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockPrismaNotification);

      const domainNotification = buildDomainNotification();
      const result = await repository.save(domainNotification);

      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'notif-1',
          userId: 'user-1',
          type: 'welcome',
          channel: 'EMAIL',
          status: 'PENDING',
        }),
      });
      expect(result).toBeInstanceOf(Notification);
      expect(result.id).toBe('notif-1');
      expect(result.userId).toBe('user-1');
      expect(result.type).toBeInstanceOf(NotificationType);
      expect(result.type.value).toBe('welcome');
    });
  });

  describe('findById', () => {
    it('should return a Notification domain entity when found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(mockPrismaNotification);

      const result = await repository.findById('notif-1');

      expect(mockPrisma.notification.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      });
      expect(result).toBeInstanceOf(Notification);
      expect(result?.id).toBe('notif-1');
    });

    it('should return null when notification is not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent-id');

      expect(mockPrisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id' },
      });
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return paginated notifications and total count', async () => {
      const prismaNotifs = [mockPrismaNotification, { ...mockPrismaNotification, id: 'notif-2' }];
      mockPrisma.notification.findMany.mockResolvedValue(prismaNotifs);
      mockPrisma.notification.count.mockResolvedValue(10);

      const result = await repository.findByUserId('user-1', 2, 5);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: { not: 'DELETED' } },
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.notification.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: { not: 'DELETED' } },
      });
      expect(result.notifications).toHaveLength(2);
      expect(result.notifications[0]).toBeInstanceOf(Notification);
      expect(result.total).toBe(10);
    });

    it('should return empty array and zero total when user has no notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await repository.findByUserId('user-no-notifs', 1, 10);

      expect(result.notifications).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should calculate skip correctly based on page and pageSize', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await repository.findByUserId('user-1', 3, 10);

      const call = mockPrisma.notification.findMany.mock.calls[0][0];
      expect(call.skip).toBe(20);
      expect(call.take).toBe(10);
    });

    it('should filter by type when provided', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await repository.findByUserId('user-1', 1, 10, { type: 'welcome' });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: 'welcome', status: { not: 'DELETED' } },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: 'welcome', status: { not: 'DELETED' } },
      });
    });

    it('should filter by channel when provided', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await repository.findByUserId('user-1', 1, 10, { channel: 'WEBSOCKET' });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', channel: 'WEBSOCKET', status: { not: 'DELETED' } },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', channel: 'WEBSOCKET', status: { not: 'DELETED' } },
      });
    });

    it('should filter by status when provided', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await repository.findByUserId('user-1', 1, 10, { status: 'SENT' });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'SENT' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'SENT' },
      });
    });

    it('should apply all filters combined', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await repository.findByUserId('user-1', 1, 10, {
        type: 'generic',
        channel: 'EMAIL',
        status: 'SENT',
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: 'generic', channel: 'EMAIL', status: 'SENT' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: 'generic', channel: 'EMAIL', status: 'SENT' },
      });
    });

    it('should exclude DELETED notifications by default when no status filter is provided', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await repository.findByUserId('user-1', 1, 10);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: { not: 'DELETED' } },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: { not: 'DELETED' } },
      });
    });

    it('should use explicit status filter when provided', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await repository.findByUserId('user-1', 1, 10, { status: 'READ' });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'READ' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'READ' },
      });
    });

    it('should exclude DELETED by default when filters is an empty object', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await repository.findByUserId('user-1', 1, 10, {});

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: { not: 'DELETED' } },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('should call prisma.notification.update with the correct id and return domain entity', async () => {
      const updatedPrisma = { ...mockPrismaNotification, status: 'SENT', sentAt: new Date() };
      mockPrisma.notification.update.mockResolvedValue(updatedPrisma);

      const domainNotification = buildDomainNotification({ status: 'SENT' });
      const result = await repository.update(domainNotification);

      expect(mockPrisma.notification.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: expect.not.objectContaining({ id: expect.anything() }),
      });
      expect(result).toBeInstanceOf(Notification);
    });
  });

  describe('countByUserAndStatus', () => {
    it('should return the count for a given user and status', async () => {
      mockPrisma.notification.count.mockResolvedValue(7);

      const result = await repository.countByUserAndStatus('user-1', 'PENDING');

      expect(mockPrisma.notification.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'PENDING' },
      });
      expect(result).toBe(7);
    });

    it('should return 0 when there are no matching notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await repository.countByUserAndStatus('user-1', 'SENT');

      expect(result).toBe(0);
    });

    it('should filter by channel when provided', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      const result = await repository.countByUserAndStatus('user-1', 'SENT', 'WEBSOCKET');

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'SENT', channel: 'WEBSOCKET' },
      });
      expect(result).toBe(3);
    });

    it('should not add channel to where when not provided', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      await repository.countByUserAndStatus('user-1', 'SENT');

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'SENT' },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should call prisma.notification.updateMany with status SENT and return count', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 4 });

      const result = await repository.markAllAsRead('user-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'SENT' },
        data: expect.objectContaining({ status: 'READ', readAt: expect.any(Date) }),
      });
      expect(result).toBe(4);
    });

    it('should filter by channel when provided', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.markAllAsRead('user-1', 'EMAIL');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'SENT', channel: 'EMAIL' },
        data: expect.objectContaining({ status: 'READ' }),
      });
      expect(result).toBe(2);
    });

    it('should return 0 when no notifications match', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.markAllAsRead('user-no-notifs');

      expect(result).toBe(0);
    });
  });

  describe('toDomain mapping', () => {
    it('should correctly map optional fields to undefined when null in Prisma', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(mockPrismaNotification);

      const result = await repository.findById('notif-1');

      expect(result).not.toBeNull();
      expect(result!.metadata).toBeUndefined();
      expect(result!.sentAt).toBeUndefined();
      expect(result!.readAt).toBeUndefined();
      expect(result!.failedAt).toBeUndefined();
      expect(result!.failureReason).toBeUndefined();
    });

    it('should correctly map populated optional fields', async () => {
      const sentAt = new Date();
      const readAt = new Date();
      const prismaWithFields = {
        ...mockPrismaNotification,
        status: 'READ',
        sentAt,
        readAt,
        metadata: { key: 'value' },
      };
      mockPrisma.notification.findUnique.mockResolvedValue(prismaWithFields);

      const result = await repository.findById('notif-1');

      expect(result!.sentAt).toEqual(sentAt);
      expect(result!.readAt).toEqual(readAt);
      expect(result!.metadata).toEqual({ key: 'value' });
    });
  });
});
