import { Test, TestingModule } from '@nestjs/testing';
import { DeleteNotificationService } from '@modules/notification/core/application/commands/delete-notification/delete-notification.service';
import { DeleteNotificationCommand } from '@modules/notification/core/application/commands/delete-notification/delete-notification.command';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@modules/notification/core/domain/repositories/notification.repository.interface';
import { Notification } from '@modules/notification/core/domain/entities/notification.entity';
import { NotificationType } from '@modules/notification/core/domain/value-objects/notification-type.vo';
import { NotificationNotFoundException } from '@modules/notification/core/application/exceptions/notification-not-found.exception';

describe('DeleteNotificationService', () => {
  let service: DeleteNotificationService;
  let notificationRepository: jest.Mocked<INotificationRepository>;

  const makeNotification = (overrides = {}) =>
    new Notification({
      id: 'notif-1',
      userId: 'user-1',
      type: new NotificationType('welcome'),
      channel: 'EMAIL',
      status: 'SENT',
      body: '<p>Hello</p>',
      ...overrides,
    });

  beforeEach(async () => {
    const mockNotificationRepository: jest.Mocked<INotificationRepository> = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      countByUserAndStatus: jest.fn(),
      markAllAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteNotificationService,
        { provide: NOTIFICATION_REPOSITORY, useValue: mockNotificationRepository },
      ],
    }).compile();

    service = module.get<DeleteNotificationService>(DeleteNotificationService);
    notificationRepository = module.get(NOTIFICATION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should mark the notification as DELETED', async () => {
      const notification = makeNotification();
      notificationRepository.findById.mockResolvedValue(notification);
      notificationRepository.update.mockResolvedValue(makeNotification({ status: 'DELETED' }));

      await service.execute(new DeleteNotificationCommand('notif-1', 'user-1'));

      expect(notificationRepository.findById).toHaveBeenCalledWith('notif-1');
      expect(notificationRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DELETED' }),
      );
    });

    it('should throw NotificationNotFoundException when notification not found', async () => {
      notificationRepository.findById.mockResolvedValue(null);

      await expect(
        service.execute(new DeleteNotificationCommand('unknown-id', 'user-1')),
      ).rejects.toThrow(NotificationNotFoundException);
      expect(notificationRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotificationNotFoundException when notification belongs to another user', async () => {
      const notification = makeNotification({ userId: 'other-user' });
      notificationRepository.findById.mockResolvedValue(notification);

      await expect(
        service.execute(new DeleteNotificationCommand('notif-1', 'user-1')),
      ).rejects.toThrow(NotificationNotFoundException);
      expect(notificationRepository.update).not.toHaveBeenCalled();
    });
  });
});
