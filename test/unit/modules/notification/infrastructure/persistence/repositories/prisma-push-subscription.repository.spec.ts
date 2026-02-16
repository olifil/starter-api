import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@database/prisma.service';
import { PrismaPushSubscriptionRepository } from '@modules/notification/infrastructure/persistence/repositories/prisma-push-subscription.repository';
import { PushSubscription } from '@modules/notification/core/domain/entities/push-subscription.entity';

const mockPrismaSub = {
  id: 'sub-1',
  userId: 'user-1',
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
  createdAt: new Date(),
};

const mockPrisma = {
  pushSubscription: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('PrismaPushSubscriptionRepository', () => {
  let repository: PrismaPushSubscriptionRepository;

  const buildDomainSubscription = (
    overrides: Partial<typeof mockPrismaSub> = {},
  ): PushSubscription => {
    const data = { ...mockPrismaSub, ...overrides };
    return new PushSubscription({
      id: data.id,
      userId: data.userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      createdAt: data.createdAt,
    });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaPushSubscriptionRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaPushSubscriptionRepository>(PrismaPushSubscriptionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    describe('when subscription with same endpoint does not exist', () => {
      it('should call prisma.pushSubscription.create and return domain entity', async () => {
        mockPrisma.pushSubscription.findFirst.mockResolvedValue(null);
        mockPrisma.pushSubscription.create.mockResolvedValue(mockPrismaSub);

        const domainSub = buildDomainSubscription();
        const result = await repository.save(domainSub);

        expect(mockPrisma.pushSubscription.findFirst).toHaveBeenCalledTimes(1);
        expect(mockPrisma.pushSubscription.findFirst).toHaveBeenCalledWith({
          where: { endpoint: mockPrismaSub.endpoint },
        });
        expect(mockPrisma.pushSubscription.create).toHaveBeenCalledTimes(1);
        expect(mockPrisma.pushSubscription.create).toHaveBeenCalledWith({
          data: {
            id: mockPrismaSub.id,
            userId: mockPrismaSub.userId,
            endpoint: mockPrismaSub.endpoint,
            p256dh: mockPrismaSub.p256dh,
            auth: mockPrismaSub.auth,
          },
        });
        expect(mockPrisma.pushSubscription.update).not.toHaveBeenCalled();
        expect(result).toBeInstanceOf(PushSubscription);
        expect(result.id).toBe('sub-1');
        expect(result.userId).toBe('user-1');
        expect(result.endpoint).toBe(mockPrismaSub.endpoint);
      });
    });

    describe('when subscription with same endpoint already exists', () => {
      it('should call prisma.pushSubscription.update and return updated domain entity', async () => {
        const existingSub = { ...mockPrismaSub, id: 'existing-sub-id' };
        const updatedSub = { ...existingSub, p256dh: 'new-p256dh', auth: 'new-auth' };
        mockPrisma.pushSubscription.findFirst.mockResolvedValue(existingSub);
        mockPrisma.pushSubscription.update.mockResolvedValue(updatedSub);

        const domainSub = buildDomainSubscription({ p256dh: 'new-p256dh', auth: 'new-auth' });
        const result = await repository.save(domainSub);

        expect(mockPrisma.pushSubscription.findFirst).toHaveBeenCalledTimes(1);
        expect(mockPrisma.pushSubscription.update).toHaveBeenCalledTimes(1);
        expect(mockPrisma.pushSubscription.update).toHaveBeenCalledWith({
          where: { id: 'existing-sub-id' },
          data: { p256dh: 'new-p256dh', auth: 'new-auth' },
        });
        expect(mockPrisma.pushSubscription.create).not.toHaveBeenCalled();
        expect(result).toBeInstanceOf(PushSubscription);
        expect(result.p256dh).toBe('new-p256dh');
        expect(result.auth).toBe('new-auth');
      });
    });
  });

  describe('findByUserId', () => {
    it('should return an array of PushSubscription domain entities ordered by createdAt desc', async () => {
      const secondSub = {
        ...mockPrismaSub,
        id: 'sub-2',
        endpoint: 'https://fcm.googleapis.com/fcm/send/xyz',
      };
      mockPrisma.pushSubscription.findMany.mockResolvedValue([mockPrismaSub, secondSub]);

      const result = await repository.findByUserId('user-1');

      expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(PushSubscription);
      expect(result[0].id).toBe('sub-1');
      expect(result[1]).toBeInstanceOf(PushSubscription);
      expect(result[1].id).toBe('sub-2');
    });

    it('should return an empty array when user has no subscriptions', async () => {
      mockPrisma.pushSubscription.findMany.mockResolvedValue([]);

      const result = await repository.findByUserId('user-no-subs');

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteByEndpoint', () => {
    it('should call prisma.pushSubscription.deleteMany with the correct endpoint', async () => {
      mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });

      await repository.deleteByEndpoint('https://fcm.googleapis.com/fcm/send/abc');

      expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: 'https://fcm.googleapis.com/fcm/send/abc' },
      });
    });

    it('should return void', async () => {
      mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteByEndpoint('https://fcm.googleapis.com/fcm/send/abc');

      expect(result).toBeUndefined();
    });
  });

  describe('deleteByUserId', () => {
    it('should call prisma.pushSubscription.deleteMany with the correct userId', async () => {
      mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 3 });

      await repository.deleteByUserId('user-1');

      expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return void', async () => {
      mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 2 });

      const result = await repository.deleteByUserId('user-1');

      expect(result).toBeUndefined();
    });
  });
});
