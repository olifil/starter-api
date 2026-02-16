import { Test, TestingModule } from '@nestjs/testing';
import { GetNotificationsHandler } from '@modules/notification/core/application/queries/get-notifications/get-notifications.handler';
import { GetNotificationsQuery } from '@modules/notification/core/application/queries/get-notifications/get-notifications.query';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@modules/notification/core/domain/repositories/notification.repository.interface';
import { Notification } from '@modules/notification/core/domain/entities/notification.entity';
import { NotificationType } from '@modules/notification/core/domain/value-objects/notification-type.vo';

describe('GetNotificationsHandler', () => {
  let handler: GetNotificationsHandler;
  let notificationRepository: jest.Mocked<INotificationRepository>;

  const makeNotification = (id: string) =>
    new Notification({
      id,
      userId: 'user-1',
      type: new NotificationType('welcome'),
      channel: 'EMAIL',
      status: 'SENT',
      body: '<p>Hello</p>',
      subject: 'Welcome',
    });

  beforeEach(async () => {
    const mockNotificationRepository: jest.Mocked<INotificationRepository> = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      countByUserAndStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetNotificationsHandler,
        { provide: NOTIFICATION_REPOSITORY, useValue: mockNotificationRepository },
      ],
    }).compile();

    handler = module.get<GetNotificationsHandler>(GetNotificationsHandler);
    notificationRepository = module.get(NOTIFICATION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return paginated notifications', async () => {
      const notifications = [makeNotification('notif-1'), makeNotification('notif-2')];
      notificationRepository.findByUserId.mockResolvedValue({ notifications, total: 2 });

      const query = new GetNotificationsQuery('user-1', 1, 10);
      const result = await handler.execute(query);

      expect(notificationRepository.findByUserId).toHaveBeenCalledWith('user-1', 1, 10);
      expect(result.data).toHaveLength(2);
      expect(result.meta.totalItems).toBe(2);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.pageSize).toBe(10);
    });

    it('should return empty paginated result when no notifications', async () => {
      notificationRepository.findByUserId.mockResolvedValue({ notifications: [], total: 0 });

      const query = new GetNotificationsQuery('user-1', 1, 10);
      const result = await handler.execute(query);

      expect(result.data).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
    });

    it('should map notifications to DTOs', async () => {
      const notification = makeNotification('notif-1');
      notificationRepository.findByUserId.mockResolvedValue({
        notifications: [notification],
        total: 1,
      });

      const query = new GetNotificationsQuery('user-1', 1, 10);
      const result = await handler.execute(query);

      expect(result.data[0].id).toBe('notif-1');
      expect(result.data[0].userId).toBe('user-1');
      expect(result.data[0].channel).toBe('EMAIL');
    });
  });
});
