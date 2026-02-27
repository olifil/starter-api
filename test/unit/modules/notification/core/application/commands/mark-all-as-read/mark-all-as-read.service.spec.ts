import { Test, TestingModule } from '@nestjs/testing';
import { MarkAllAsReadService } from '@modules/notification/core/application/commands/mark-all-as-read/mark-all-as-read.service';
import { MarkAllAsReadCommand } from '@modules/notification/core/application/commands/mark-all-as-read/mark-all-as-read.command';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@modules/notification/core/domain/repositories/notification.repository.interface';

describe('MarkAllAsReadService', () => {
  let service: MarkAllAsReadService;
  let notificationRepository: jest.Mocked<INotificationRepository>;

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
        MarkAllAsReadService,
        { provide: NOTIFICATION_REPOSITORY, useValue: mockNotificationRepository },
      ],
    }).compile();

    service = module.get<MarkAllAsReadService>(MarkAllAsReadService);
    notificationRepository = module.get(NOTIFICATION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should mark all SENT notifications as read and return count', async () => {
      notificationRepository.markAllAsRead.mockResolvedValue(5);

      const command = new MarkAllAsReadCommand('user-1');
      const result = await service.execute(command);

      expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual({ count: 5 });
    });

    it('should pass channel filter to repository', async () => {
      notificationRepository.markAllAsRead.mockResolvedValue(2);

      const command = new MarkAllAsReadCommand('user-1', 'EMAIL');
      const result = await service.execute(command);

      expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith('user-1', 'EMAIL');
      expect(result).toEqual({ count: 2 });
    });

    it('should return count 0 when no notifications match', async () => {
      notificationRepository.markAllAsRead.mockResolvedValue(0);

      const command = new MarkAllAsReadCommand('user-no-notifs');
      const result = await service.execute(command);

      expect(result).toEqual({ count: 0 });
    });
  });
});
