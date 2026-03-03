import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { OnUserCreatedHandler } from '@modules/notification/core/application/events/on-user-created/on-user-created.handler';
import { UserCreatedEvent } from '@modules/user/core/domain/events/user-created.event';
import { SendNotificationCommand } from '@modules/notification/core/application/commands/send-notification/send-notification.command';
import {
  CHANNEL_SENDERS,
  ChannelSenderPort,
} from '@modules/notification/core/domain/ports/channel-sender.port';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from '@modules/notification/core/domain/repositories/notification-preference.repository.interface';
import { NotificationPreference } from '@modules/notification/core/domain/entities/notification-preference.entity';

const makeChannelSender = (channel: string, enabled: boolean): jest.Mocked<ChannelSenderPort> =>
  ({ channel, isEnabled: jest.fn().mockReturnValue(enabled), send: jest.fn() }) as never;

describe('OnUserCreatedHandler', () => {
  let handler: OnUserCreatedHandler;
  let commandBus: jest.Mocked<CommandBus>;
  let preferenceRepository: jest.Mocked<INotificationPreferenceRepository>;
  let channelSenders: jest.Mocked<ChannelSenderPort>[];

  beforeEach(async () => {
    const mockCommandBus = { execute: jest.fn().mockResolvedValue([]) };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'app.frontendUrl') return 'http://localhost:4200';
        if (key === 'app.emailVerificationPath') return '/verify-email';
        return defaultValue;
      }),
    };

    channelSenders = [
      makeChannelSender('EMAIL', true),
      makeChannelSender('SMS', false),
      makeChannelSender('PUSH', false),
      makeChannelSender('WEB_PUSH', true),
      makeChannelSender('WEBSOCKET', true),
    ];

    preferenceRepository = { upsert: jest.fn().mockResolvedValue(undefined) } as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnUserCreatedHandler,
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CHANNEL_SENDERS, useValue: channelSenders },
        { provide: NOTIFICATION_PREFERENCE_REPOSITORY, useValue: preferenceRepository },
      ],
    }).compile();

    handler = module.get<OnUserCreatedHandler>(OnUserCreatedHandler);
    commandBus = module.get(CommandBus);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('should dispatch a SendNotificationCommand with correct arguments', async () => {
      const event = new UserCreatedEvent(
        'user-1',
        'john@example.com',
        'John',
        'Doe',
        'verify-token',
      );

      await handler.handle(event);

      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(SendNotificationCommand));

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.userIds).toEqual(['user-1']);
      expect(command.type).toBe('welcome');
      expect(command.channels).toEqual(['EMAIL']);
      expect(command.variables).toMatchObject({ firstName: 'John', lastName: 'Doe' });
    });

    it('should build verificationLink from frontendUrl, path and token', async () => {
      const event = new UserCreatedEvent('user-1', 'john@example.com', 'John', 'Doe', 'mytoken');

      await handler.handle(event);

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.variables?.['verificationLink']).toBe(
        'http://localhost:4200/verify-email?token=mytoken',
      );
    });

    it('should pass undefined verificationLink when token is absent', async () => {
      const event = new UserCreatedEvent('user-1', 'john@example.com', 'John', 'Doe');

      await handler.handle(event);

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.variables?.['verificationLink']).toBeUndefined();
    });

    it('should send to the correct userId', async () => {
      const event = new UserCreatedEvent('user-42', 'jane@example.com', 'Jane', 'Smith', 'tok');

      await handler.handle(event);

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.userIds).toEqual(['user-42']);
    });

    describe('preference initialization', () => {
      it('should create a preference for every channel', async () => {
        const event = new UserCreatedEvent('user-1', 'john@example.com', 'John', 'Doe');

        await handler.handle(event);

        expect(preferenceRepository.upsert).toHaveBeenCalledTimes(5);
      });

      it('should set enabled=true for configured channels and enabled=false for noop channels', async () => {
        const event = new UserCreatedEvent('user-1', 'john@example.com', 'John', 'Doe');

        await handler.handle(event);

        const upsertedPrefs = preferenceRepository.upsert.mock.calls.map(
          ([pref]: [NotificationPreference]) => ({ channel: pref.channel, enabled: pref.enabled }),
        );

        expect(upsertedPrefs).toEqual(
          expect.arrayContaining([
            { channel: 'EMAIL', enabled: true },
            { channel: 'SMS', enabled: false },
            { channel: 'PUSH', enabled: false },
            { channel: 'WEB_PUSH', enabled: true },
            { channel: 'WEBSOCKET', enabled: true },
          ]),
        );
      });

      it('should use upsert (idempotent) not save', async () => {
        const event = new UserCreatedEvent('user-1', 'john@example.com', 'John', 'Doe');

        await handler.handle(event);

        expect(preferenceRepository.upsert).toHaveBeenCalled();
      });

      it('should associate preferences to the correct userId', async () => {
        const event = new UserCreatedEvent('user-42', 'jane@example.com', 'Jane', 'Smith');

        await handler.handle(event);

        preferenceRepository.upsert.mock.calls.forEach(([pref]: [NotificationPreference]) => {
          expect(pref.userId).toBe('user-42');
        });
      });
    });
  });
});
