import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { OnAccountVerifiedHandler } from '@modules/notification/core/application/events/on-account-verified/on-account-verified.handler';
import { AccountVerifiedEvent } from '@modules/auth/core/domain/events/account-verified.event';
import { SendNotificationCommand } from '@modules/notification/core/application/commands/send-notification/send-notification.command';

describe('OnAccountVerifiedHandler', () => {
  let handler: OnAccountVerifiedHandler;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const mockCommandBus = { execute: jest.fn().mockResolvedValue([]) };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'app.name') return 'Starter API';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnAccountVerifiedHandler,
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    handler = module.get<OnAccountVerifiedHandler>(OnAccountVerifiedHandler);
    commandBus = module.get(CommandBus);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('should dispatch a SendNotificationCommand with correct arguments', async () => {
      const event = new AccountVerifiedEvent('user-1', 'john@example.com', 'John');

      await handler.handle(event);

      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(SendNotificationCommand));

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.userIds).toEqual(['user-1']);
      expect(command.type).toBe('account-verified');
      expect(command.channels).toEqual(['EMAIL']);
      expect(command.variables).toMatchObject({
        firstName: 'John',
        appName: 'Starter API',
      });
    });

    it('should use default appName when config is missing', async () => {
      const mockConfigService = {
        get: jest.fn().mockImplementation((_key: string, defaultValue?: unknown) => defaultValue),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OnAccountVerifiedHandler,
          { provide: CommandBus, useValue: { execute: jest.fn().mockResolvedValue([]) } },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const localHandler = module.get<OnAccountVerifiedHandler>(OnAccountVerifiedHandler);
      const localCommandBus = module.get(CommandBus);

      const event = new AccountVerifiedEvent('user-1', 'john@example.com', 'John');
      await localHandler.handle(event);

      const command = localCommandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.variables?.['appName']).toBe('Starter API');
    });

    it('should send to the correct userId', async () => {
      const event = new AccountVerifiedEvent('user-42', 'jane@example.com', 'Jane');

      await handler.handle(event);

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.userIds).toEqual(['user-42']);
    });

    it('should use fr locale', async () => {
      const event = new AccountVerifiedEvent('user-1', 'john@example.com', 'John');

      await handler.handle(event);

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.locale).toBe('fr');
    });
  });
});
