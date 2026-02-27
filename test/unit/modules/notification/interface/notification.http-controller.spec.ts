import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { NotificationHttpController } from '@modules/notification/interface/http-controller/notification.http-controller';
import { SendNotificationCommand } from '@modules/notification/core/application/commands/send-notification/send-notification.command';
import { GetNotificationsQuery } from '@modules/notification/core/application/queries/get-notifications/get-notifications.query';
import { MarkAsReadCommand } from '@modules/notification/core/application/commands/mark-as-read/mark-as-read.command';
import { MarkAllAsReadCommand } from '@modules/notification/core/application/commands/mark-all-as-read/mark-all-as-read.command';
import { DeleteNotificationCommand } from '@modules/notification/core/application/commands/delete-notification/delete-notification.command';
import {
  ITemplateRenderer,
  TEMPLATE_RENDERER,
} from '@modules/notification/core/application/services/template-renderer.service';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@modules/notification/core/domain/repositories/notification.repository.interface';

describe('NotificationHttpController', () => {
  let controller: NotificationHttpController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let templateRenderer: jest.Mocked<ITemplateRenderer>;
  let notificationRepository: Partial<jest.Mocked<INotificationRepository>>;

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    templateRenderer = { render: jest.fn() };
    notificationRepository = { countByUserAndStatus: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationHttpController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: TEMPLATE_RENDERER, useValue: templateRenderer },
        { provide: NOTIFICATION_REPOSITORY, useValue: notificationRepository },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get<NotificationHttpController>(NotificationHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('send', () => {
    it('should dispatch SendNotificationCommand and return result', async () => {
      const dto = {
        userIds: ['user-1'],
        type: 'welcome',
        channels: ['EMAIL'],
        variables: { name: 'Alice' },
        locale: 'fr',
      };
      const expected = [{ id: 'notif-1' }];
      commandBus.execute.mockResolvedValue(expected);

      const result = await controller.send(dto as never);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new SendNotificationCommand(dto.userIds, dto.type, dto.channels, dto.variables, dto.locale),
      );
      expect(result).toBe(expected);
    });
  });

  describe('getMyNotifications', () => {
    it('should dispatch GetNotificationsQuery with parsed pagination', async () => {
      const user = { userId: 'user-1' };
      const expected = { data: [], total: 0 };
      queryBus.execute.mockResolvedValue(expected);

      const result = await controller.getMyNotifications(user, '2', '15');

      expect(queryBus.execute).toHaveBeenCalledWith(new GetNotificationsQuery('user-1', 2, 15));
      expect(result).toBe(expected);
    });

    it('should pass type filter to query', async () => {
      const user = { userId: 'user-1' };
      queryBus.execute.mockResolvedValue({ data: [], meta: {} });

      await controller.getMyNotifications(user, '1', '10', 'welcome');

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetNotificationsQuery('user-1', 1, 10, 'welcome', undefined, undefined),
      );
    });

    it('should pass channel filter to query', async () => {
      const user = { userId: 'user-1' };
      queryBus.execute.mockResolvedValue({ data: [], meta: {} });

      await controller.getMyNotifications(user, '1', '10', undefined, 'EMAIL');

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetNotificationsQuery('user-1', 1, 10, undefined, 'EMAIL', undefined),
      );
    });

    it('should pass status filter to query', async () => {
      const user = { userId: 'user-1' };
      queryBus.execute.mockResolvedValue({ data: [], meta: {} });

      await controller.getMyNotifications(user, '1', '10', undefined, undefined, 'SENT');

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetNotificationsQuery('user-1', 1, 10, undefined, undefined, 'SENT'),
      );
    });

    it('should pass all filters combined to query', async () => {
      const user = { userId: 'user-1' };
      queryBus.execute.mockResolvedValue({ data: [], meta: {} });

      await controller.getMyNotifications(user, '1', '10', 'generic', 'WEBSOCKET', 'SENT');

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetNotificationsQuery('user-1', 1, 10, 'generic', 'WEBSOCKET', 'SENT'),
      );
    });

    it('should throw BadRequestException for invalid channel', async () => {
      const user = { userId: 'user-1' };

      await expect(
        controller.getMyNotifications(user, '1', '10', undefined, 'INVALID_CHANNEL'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid status', async () => {
      const user = { userId: 'user-1' };

      await expect(
        controller.getMyNotifications(user, '1', '10', undefined, undefined, 'INVALID_STATUS'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid type format', async () => {
      const user = { userId: 'user-1' };

      await expect(controller.getMyNotifications(user, '1', '10', 'INVALID TYPE!')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markAsRead', () => {
    it('should dispatch MarkAsReadCommand and return void when id is provided', async () => {
      const user = { userId: 'user-1' };
      commandBus.execute.mockResolvedValue(undefined);

      const result = await controller.markAsRead(user, 'notif-1');

      expect(commandBus.execute).toHaveBeenCalledWith(new MarkAsReadCommand('notif-1', 'user-1'));
      expect(result).toBeUndefined();
    });

    it('should dispatch MarkAllAsReadCommand and return count when id is not provided', async () => {
      const user = { userId: 'user-1' };
      commandBus.execute.mockResolvedValue({ count: 5 });

      const result = await controller.markAsRead(user);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new MarkAllAsReadCommand('user-1', undefined),
      );
      expect(result).toEqual({ count: 5 });
    });

    it('should dispatch MarkAllAsReadCommand with channel filter', async () => {
      const user = { userId: 'user-1' };
      commandBus.execute.mockResolvedValue({ count: 2 });

      await controller.markAsRead(user, undefined, 'EMAIL');

      expect(commandBus.execute).toHaveBeenCalledWith(new MarkAllAsReadCommand('user-1', 'EMAIL'));
    });

    it('should throw BadRequestException for invalid channel in bulk mode', async () => {
      const user = { userId: 'user-1' };

      await expect(controller.markAsRead(user, undefined, 'INVALID')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return count with default status SENT', async () => {
      const user = { userId: 'user-1' };
      notificationRepository.countByUserAndStatus!.mockResolvedValue(5);

      const result = await controller.getUnreadCount(user);

      expect(notificationRepository.countByUserAndStatus).toHaveBeenCalledWith(
        'user-1',
        'SENT',
        undefined,
      );
      expect(result).toEqual({ count: 5 });
    });

    it('should filter by channel when provided', async () => {
      const user = { userId: 'user-1' };
      notificationRepository.countByUserAndStatus!.mockResolvedValue(2);

      const result = await controller.getUnreadCount(user, 'WEBSOCKET');

      expect(notificationRepository.countByUserAndStatus).toHaveBeenCalledWith(
        'user-1',
        'SENT',
        'WEBSOCKET',
      );
      expect(result).toEqual({ count: 2 });
    });

    it('should use provided status', async () => {
      const user = { userId: 'user-1' };
      notificationRepository.countByUserAndStatus!.mockResolvedValue(3);

      const result = await controller.getUnreadCount(user, undefined, 'READ');

      expect(notificationRepository.countByUserAndStatus).toHaveBeenCalledWith(
        'user-1',
        'READ',
        undefined,
      );
      expect(result).toEqual({ count: 3 });
    });

    it('should filter by channel and status combined', async () => {
      const user = { userId: 'user-1' };
      notificationRepository.countByUserAndStatus!.mockResolvedValue(1);

      await controller.getUnreadCount(user, 'EMAIL', 'FAILED');

      expect(notificationRepository.countByUserAndStatus).toHaveBeenCalledWith(
        'user-1',
        'FAILED',
        'EMAIL',
      );
    });

    it('should throw BadRequestException for invalid channel', async () => {
      const user = { userId: 'user-1' };

      await expect(controller.getUnreadCount(user, 'INVALID_CHANNEL')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid status', async () => {
      const user = { userId: 'user-1' };

      await expect(controller.getUnreadCount(user, undefined, 'INVALID_STATUS')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteNotification', () => {
    it('should dispatch DeleteNotificationCommand', async () => {
      const user = { userId: 'user-1' };
      commandBus.execute.mockResolvedValue(undefined);

      await controller.deleteNotification('notif-1', user);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new DeleteNotificationCommand('notif-1', 'user-1'),
      );
    });
  });

  describe('preview', () => {
    it('should call templateRenderer.render with correct args', () => {
      templateRenderer.render.mockReturnValue({ subject: 'Bienvenue', body: '<p>Hello</p>' });

      const result = controller.preview('welcome', 'fr', 'EMAIL');

      expect(templateRenderer.render).toHaveBeenCalledWith(
        'welcome',
        'EMAIL',
        'fr',
        expect.objectContaining({ firstName: 'Jean' }),
      );
      expect(result).toEqual({ subject: 'Bienvenue', body: '<p>Hello</p>' });
    });
  });
});
