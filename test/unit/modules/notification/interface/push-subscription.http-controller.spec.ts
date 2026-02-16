import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { PushSubscriptionHttpController } from '@modules/notification/interface/http-controller/push-subscription.http-controller';
import {
  IPushSubscriptionRepository,
  PUSH_SUBSCRIPTION_REPOSITORY,
} from '@modules/notification/core/domain/repositories/push-subscription.repository.interface';
import { RegisterPushSubscriptionCommand } from '@modules/notification/core/application/commands/register-push-subscription/register-push-subscription.command';
import { DeletePushSubscriptionCommand } from '@modules/notification/core/application/commands/delete-push-subscription/delete-push-subscription.command';
import { PushSubscription } from '@modules/notification/core/domain/entities/push-subscription.entity';
import { PushSubscriptionResponseDto } from '@modules/notification/core/application/dtos/push-subscription-response.dto';

describe('PushSubscriptionHttpController', () => {
  let controller: PushSubscriptionHttpController;
  let commandBus: jest.Mocked<CommandBus>;
  let pushSubscriptionRepository: jest.Mocked<IPushSubscriptionRepository>;

  const currentUser = { userId: 'user-1' };
  const endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';

  const makeSubscription = (overrides = {}) =>
    new PushSubscription({
      id: 'sub-1',
      userId: 'user-1',
      endpoint,
      p256dh: 'base64-p256dh',
      auth: 'base64-auth',
      createdAt: new Date('2024-01-01'),
      ...overrides,
    });

  beforeEach(async () => {
    const mockCommandBus = { execute: jest.fn() };

    const mockPushSubscriptionRepository: jest.Mocked<IPushSubscriptionRepository> = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      deleteByEndpoint: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PushSubscriptionHttpController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: PUSH_SUBSCRIPTION_REPOSITORY, useValue: mockPushSubscriptionRepository },
      ],
    }).compile();

    controller = module.get<PushSubscriptionHttpController>(PushSubscriptionHttpController);
    commandBus = module.get(CommandBus);
    pushSubscriptionRepository = module.get(PUSH_SUBSCRIPTION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should dispatch RegisterPushSubscriptionCommand and return DTO', async () => {
      const responseDto = PushSubscriptionResponseDto.fromDomain(makeSubscription());
      commandBus.execute.mockResolvedValue(responseDto);

      const dto = { endpoint, p256dh: 'base64-p256dh', auth: 'base64-auth' };
      const result = await controller.register(currentUser, dto as never);

      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(RegisterPushSubscriptionCommand));
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          endpoint,
          p256dh: 'base64-p256dh',
          auth: 'base64-auth',
        }),
      );
      expect(result).toBe(responseDto);
    });
  });

  describe('getMySubscriptions', () => {
    it('should return DTOs for all user subscriptions', async () => {
      const subs = [
        makeSubscription({ id: 'sub-1' }),
        makeSubscription({ id: 'sub-2', endpoint: 'https://push.example.com/2' }),
      ];
      pushSubscriptionRepository.findByUserId.mockResolvedValue(subs);

      const result = await controller.getMySubscriptions(currentUser);

      expect(pushSubscriptionRepository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(PushSubscriptionResponseDto);
      expect(result[0].id).toBe('sub-1');
      expect(result[1].id).toBe('sub-2');
    });

    it('should return empty array when no subscriptions', async () => {
      pushSubscriptionRepository.findByUserId.mockResolvedValue([]);

      const result = await controller.getMySubscriptions(currentUser);

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should dispatch DeletePushSubscriptionCommand', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      const dto = { endpoint };
      await controller.delete(currentUser, dto as never);

      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeletePushSubscriptionCommand));
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', endpoint }),
      );
    });

    it('should return void', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      const result = await controller.delete(currentUser, { endpoint } as never);

      expect(result).toBeUndefined();
    });
  });
});
