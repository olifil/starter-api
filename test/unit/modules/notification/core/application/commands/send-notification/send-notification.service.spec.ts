import { Test, TestingModule } from '@nestjs/testing';
import { SendNotificationService } from '@modules/notification/core/application/commands/send-notification/send-notification.service';
import { SendNotificationCommand } from '@modules/notification/core/application/commands/send-notification/send-notification.command';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@modules/notification/core/domain/repositories/notification.repository.interface';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from '@modules/notification/core/domain/repositories/notification-preference.repository.interface';
import {
  ChannelSenderPort,
  CHANNEL_SENDERS,
} from '@modules/notification/core/domain/ports/channel-sender.port';
import {
  ITemplateRenderer,
  TEMPLATE_RENDERER,
} from '@modules/notification/core/application/services/template-renderer.service';
import { NotificationProducer } from '@modules/notification/infrastructure/queue/notification.producer';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { Notification } from '@modules/notification/core/domain/entities/notification.entity';
import { NotificationType } from '@modules/notification/core/domain/value-objects/notification-type.vo';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';

describe('SendNotificationService', () => {
  let service: SendNotificationService;
  let notificationRepository: jest.Mocked<INotificationRepository>;
  let preferenceRepository: jest.Mocked<INotificationPreferenceRepository>;
  let templateRenderer: jest.Mocked<ITemplateRenderer>;
  let userRepository: jest.Mocked<IUserRepository>;
  let producer: jest.Mocked<NotificationProducer>;
  let emailSender: jest.Mocked<ChannelSenderPort>;

  const mockUser = new User({
    id: 'user-1',
    email: new Email('test@example.com'),
    password: HashedPassword.fromHash('hashed'),
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeNotification = () =>
    new Notification({
      id: 'notif-1',
      userId: 'user-1',
      type: new NotificationType('welcome'),
      channel: 'EMAIL',
      subject: 'Welcome',
      body: '<p>Hello</p>',
    });

  beforeEach(async () => {
    const mockNotificationRepository: jest.Mocked<INotificationRepository> = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      countByUserAndStatus: jest.fn(),
    };

    const mockPreferenceRepository: jest.Mocked<INotificationPreferenceRepository> = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndChannel: jest.fn(),
      upsert: jest.fn(),
    };

    const mockTemplateRenderer: jest.Mocked<ITemplateRenderer> = {
      render: jest.fn(),
    };

    const mockUserRepository: Partial<jest.Mocked<IUserRepository>> = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAll: jest.fn(),
    };

    const mockProducer = {
      enqueue: jest.fn(),
    };

    const mockEmailSender: jest.Mocked<ChannelSenderPort> = {
      channel: 'EMAIL',
      send: jest.fn(),
      isEnabled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendNotificationService,
        { provide: NOTIFICATION_REPOSITORY, useValue: mockNotificationRepository },
        { provide: NOTIFICATION_PREFERENCE_REPOSITORY, useValue: mockPreferenceRepository },
        { provide: TEMPLATE_RENDERER, useValue: mockTemplateRenderer },
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: CHANNEL_SENDERS, useValue: [mockEmailSender] },
        { provide: NotificationProducer, useValue: mockProducer },
      ],
    }).compile();

    service = module.get<SendNotificationService>(SendNotificationService);
    notificationRepository = module.get(NOTIFICATION_REPOSITORY);
    preferenceRepository = module.get(NOTIFICATION_PREFERENCE_REPOSITORY);
    templateRenderer = module.get(TEMPLATE_RENDERER);
    userRepository = module.get(USER_REPOSITORY) as jest.Mocked<IUserRepository>;
    producer = module.get(NotificationProducer);
    emailSender = mockEmailSender;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should return empty array when no users found', async () => {
      userRepository.findByIds.mockResolvedValue([]);

      const command = new SendNotificationCommand(
        ['unknown-user'],
        'welcome',
        ['EMAIL'],
        {},
        'fr',
      );
      const result = await service.execute(command);

      expect(result).toEqual([]);
      expect(notificationRepository.save).not.toHaveBeenCalled();
    });

    it('should skip channel when sender is disabled', async () => {
      userRepository.findByIds.mockResolvedValue([mockUser]);
      emailSender.isEnabled.mockReturnValue(false);

      const command = new SendNotificationCommand(['user-1'], 'welcome', ['EMAIL'], {}, 'fr');
      const result = await service.execute(command);

      expect(result).toEqual([]);
      expect(notificationRepository.save).not.toHaveBeenCalled();
    });

    it('should skip channel when user preference is disabled', async () => {
      const {
        NotificationPreference,
      } = require('@modules/notification/core/domain/entities/notification-preference.entity');
      const disabledPref = new NotificationPreference({
        userId: 'user-1',
        channel: 'EMAIL',
        enabled: false,
      });

      userRepository.findByIds.mockResolvedValue([mockUser]);
      emailSender.isEnabled.mockReturnValue(true);
      preferenceRepository.findByUserIdAndChannel.mockResolvedValue(disabledPref);

      const command = new SendNotificationCommand(['user-1'], 'welcome', ['EMAIL'], {}, 'fr');
      const result = await service.execute(command);

      expect(result).toEqual([]);
      expect(notificationRepository.save).not.toHaveBeenCalled();
    });

    it('should send notification and enqueue when all conditions met', async () => {
      const notification = makeNotification();

      userRepository.findByIds.mockResolvedValue([mockUser]);
      emailSender.isEnabled.mockReturnValue(true);
      preferenceRepository.findByUserIdAndChannel.mockResolvedValue(null);
      templateRenderer.render.mockReturnValue({ subject: 'Welcome', body: '<p>Hello</p>' });
      notificationRepository.save.mockResolvedValue(notification);
      notificationRepository.update.mockResolvedValue(notification);

      const command = new SendNotificationCommand(
        ['user-1'],
        'welcome',
        ['EMAIL'],
        { firstName: 'John' },
        'fr',
      );
      const result = await service.execute(command);

      expect(notificationRepository.save).toHaveBeenCalledWith(expect.any(Notification));
      expect(notificationRepository.update).toHaveBeenCalled();
      expect(producer.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationId: notification.id,
          userId: 'user-1',
          channel: 'EMAIL',
          to: 'test@example.com',
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-1');
    });

    it('should fetch all users when userIds is empty', async () => {
      const notification = makeNotification();

      userRepository.findAll.mockResolvedValue({ users: [mockUser], total: 1 });
      emailSender.isEnabled.mockReturnValue(true);
      preferenceRepository.findByUserIdAndChannel.mockResolvedValue(null);
      templateRenderer.render.mockReturnValue({ subject: 'Welcome', body: '<p>Hello</p>' });
      notificationRepository.save.mockResolvedValue(notification);
      notificationRepository.update.mockResolvedValue(notification);

      const command = new SendNotificationCommand([], 'welcome', ['EMAIL'], {}, 'fr');
      const result = await service.execute(command);

      expect(userRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should render template with correct arguments', async () => {
      const notification = makeNotification();

      userRepository.findByIds.mockResolvedValue([mockUser]);
      emailSender.isEnabled.mockReturnValue(true);
      preferenceRepository.findByUserIdAndChannel.mockResolvedValue(null);
      templateRenderer.render.mockReturnValue({ subject: 'Welcome', body: '<p>Hello</p>' });
      notificationRepository.save.mockResolvedValue(notification);
      notificationRepository.update.mockResolvedValue(notification);

      const variables = { firstName: 'John' };
      const command = new SendNotificationCommand(
        ['user-1'],
        'welcome',
        ['EMAIL'],
        variables,
        'fr',
      );
      await service.execute(command);

      expect(templateRenderer.render).toHaveBeenCalledWith('welcome', 'EMAIL', 'fr', variables);
    });
  });
});
