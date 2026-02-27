import { Test, TestingModule } from '@nestjs/testing';
import { MarkAsReadService } from '@modules/notification/core/application/commands/mark-as-read/mark-as-read.service';
import { MarkAsReadCommand } from '@modules/notification/core/application/commands/mark-as-read/mark-as-read.command';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@modules/notification/core/domain/repositories/notification.repository.interface';
import { Notification } from '@modules/notification/core/domain/entities/notification.entity';
import { NotificationType } from '@modules/notification/core/domain/value-objects/notification-type.vo';
import { NotificationNotFoundException } from '@modules/notification/core/application/exceptions/notification-not-found.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

describe('MarkAsReadService', () => {
  let service: MarkAsReadService;
  let notificationRepository: jest.Mocked<INotificationRepository>;

  const makeNotification = (overrides = {}) =>
    new Notification({
      id: 'notif-1',
      userId: 'user-1',
      type: new NotificationType('welcome'),
      channel: 'EMAIL',
      status: 'SENT',
      body: '<p>Hello</p>',
      subject: 'Welcome',
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
        MarkAsReadService,
        { provide: NOTIFICATION_REPOSITORY, useValue: mockNotificationRepository },
        { provide: MatomoService, useValue: { trackNotificationMarkedAsRead: jest.fn() } },
      ],
    }).compile();

    service = module.get<MarkAsReadService>(MarkAsReadService);
    notificationRepository = module.get(NOTIFICATION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should mark notification as read and return void', async () => {
      const notification = makeNotification();
      const updated = makeNotification({ status: 'READ', readAt: new Date() });

      notificationRepository.findById.mockResolvedValue(notification);
      notificationRepository.update.mockResolvedValue(updated);

      const command = new MarkAsReadCommand('notif-1', 'user-1');
      const result = await service.execute(command);

      expect(notificationRepository.findById).toHaveBeenCalledWith('notif-1');
      expect(notificationRepository.update).toHaveBeenCalledWith(notification);
      expect(result).toBeUndefined();
    });

    it('should throw NotificationNotFoundException when notification not found', async () => {
      notificationRepository.findById.mockResolvedValue(null);

      const command = new MarkAsReadCommand('unknown-id', 'user-1');

      await expect(service.execute(command)).rejects.toThrow(NotificationNotFoundException);
    });

    it('should throw NotificationNotFoundException when notification belongs to another user', async () => {
      const notification = makeNotification({ userId: 'other-user' });
      notificationRepository.findById.mockResolvedValue(notification);

      const command = new MarkAsReadCommand('notif-1', 'user-1');

      await expect(service.execute(command)).rejects.toThrow(NotificationNotFoundException);
      expect(notificationRepository.update).not.toHaveBeenCalled();
    });
  });
});
