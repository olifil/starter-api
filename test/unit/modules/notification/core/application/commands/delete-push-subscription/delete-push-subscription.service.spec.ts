import { Test, TestingModule } from '@nestjs/testing';
import { DeletePushSubscriptionService } from '@modules/notification/core/application/commands/delete-push-subscription/delete-push-subscription.service';
import { DeletePushSubscriptionCommand } from '@modules/notification/core/application/commands/delete-push-subscription/delete-push-subscription.command';
import {
  IPushSubscriptionRepository,
  PUSH_SUBSCRIPTION_REPOSITORY,
} from '@modules/notification/core/domain/repositories/push-subscription.repository.interface';

describe('DeletePushSubscriptionService', () => {
  let service: DeletePushSubscriptionService;
  let pushSubscriptionRepository: jest.Mocked<IPushSubscriptionRepository>;

  beforeEach(async () => {
    const mockPushSubscriptionRepository: jest.Mocked<IPushSubscriptionRepository> = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      deleteByEndpoint: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeletePushSubscriptionService,
        {
          provide: PUSH_SUBSCRIPTION_REPOSITORY,
          useValue: mockPushSubscriptionRepository,
        },
      ],
    }).compile();

    service = module.get<DeletePushSubscriptionService>(DeletePushSubscriptionService);
    pushSubscriptionRepository = module.get(PUSH_SUBSCRIPTION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should call deleteByEndpoint with the correct endpoint', async () => {
      pushSubscriptionRepository.deleteByEndpoint.mockResolvedValue(undefined);

      const endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';
      const command = new DeletePushSubscriptionCommand('user-1', endpoint);

      await service.execute(command);

      expect(pushSubscriptionRepository.deleteByEndpoint).toHaveBeenCalledWith(endpoint);
      expect(pushSubscriptionRepository.deleteByEndpoint).toHaveBeenCalledTimes(1);
    });

    it('should return void on success', async () => {
      pushSubscriptionRepository.deleteByEndpoint.mockResolvedValue(undefined);

      const command = new DeletePushSubscriptionCommand(
        'user-1',
        'https://push.example.com/endpoint',
      );

      const result = await service.execute(command);

      expect(result).toBeUndefined();
    });

    it('should not use the userId (deletion is by endpoint only)', async () => {
      pushSubscriptionRepository.deleteByEndpoint.mockResolvedValue(undefined);

      const command = new DeletePushSubscriptionCommand(
        'user-1',
        'https://fcm.googleapis.com/fcm/send/abc123',
      );
      await service.execute(command);

      expect(pushSubscriptionRepository.deleteByUserId).not.toHaveBeenCalled();
    });
  });
});
