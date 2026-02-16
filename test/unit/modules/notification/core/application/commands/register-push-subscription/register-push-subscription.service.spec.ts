import { Test, TestingModule } from '@nestjs/testing';
import { RegisterPushSubscriptionService } from '@modules/notification/core/application/commands/register-push-subscription/register-push-subscription.service';
import { RegisterPushSubscriptionCommand } from '@modules/notification/core/application/commands/register-push-subscription/register-push-subscription.command';
import {
  IPushSubscriptionRepository,
  PUSH_SUBSCRIPTION_REPOSITORY,
} from '@modules/notification/core/domain/repositories/push-subscription.repository.interface';
import { PushSubscription } from '@modules/notification/core/domain/entities/push-subscription.entity';
import { PushSubscriptionResponseDto } from '@modules/notification/core/application/dtos/push-subscription-response.dto';

describe('RegisterPushSubscriptionService', () => {
  let service: RegisterPushSubscriptionService;
  let pushSubscriptionRepository: jest.Mocked<IPushSubscriptionRepository>;

  const makeSavedSubscription = (overrides = {}) =>
    new PushSubscription({
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh: 'base64-p256dh-key',
      auth: 'base64-auth-key',
      createdAt: new Date('2024-01-01'),
      ...overrides,
    });

  beforeEach(async () => {
    const mockPushSubscriptionRepository: jest.Mocked<IPushSubscriptionRepository> = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      deleteByEndpoint: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterPushSubscriptionService,
        {
          provide: PUSH_SUBSCRIPTION_REPOSITORY,
          useValue: mockPushSubscriptionRepository,
        },
      ],
    }).compile();

    service = module.get<RegisterPushSubscriptionService>(RegisterPushSubscriptionService);
    pushSubscriptionRepository = module.get(PUSH_SUBSCRIPTION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should save subscription and return a DTO', async () => {
      const saved = makeSavedSubscription();
      pushSubscriptionRepository.save.mockResolvedValue(saved);

      const command = new RegisterPushSubscriptionCommand(
        'user-1',
        'https://fcm.googleapis.com/fcm/send/abc123',
        'base64-p256dh-key',
        'base64-auth-key',
      );

      const result = await service.execute(command);

      expect(pushSubscriptionRepository.save).toHaveBeenCalledWith(expect.any(PushSubscription));
      expect(result).toBeInstanceOf(PushSubscriptionResponseDto);
      expect(result.id).toBe('sub-1');
      expect(result.userId).toBe('user-1');
      expect(result.endpoint).toBe('https://fcm.googleapis.com/fcm/send/abc123');
    });

    it('should pass correct data to repository', async () => {
      const saved = makeSavedSubscription();
      pushSubscriptionRepository.save.mockResolvedValue(saved);

      const command = new RegisterPushSubscriptionCommand(
        'user-42',
        'https://push.example.com/endpoint',
        'p256dh-abc',
        'auth-xyz',
      );

      await service.execute(command);

      expect(pushSubscriptionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-42',
          endpoint: 'https://push.example.com/endpoint',
          p256dh: 'p256dh-abc',
          auth: 'auth-xyz',
        }),
      );
    });

    it('should generate a new id for the subscription', async () => {
      const saved = makeSavedSubscription();
      pushSubscriptionRepository.save.mockResolvedValue(saved);

      const command = new RegisterPushSubscriptionCommand(
        'user-1',
        'https://fcm.googleapis.com/fcm/send/abc123',
        'p256dh',
        'auth',
      );

      await service.execute(command);

      const passedSub = pushSubscriptionRepository.save.mock.calls[0][0];
      expect(passedSub.id).toBeTruthy();
    });
  });
});
