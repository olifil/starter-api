import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { OnUserCreatedHandler } from '@modules/notification/core/application/events/on-user-created/on-user-created.handler';
import { UserCreatedEvent } from '@modules/user/core/domain/events/user-created.event';
import { SendNotificationCommand } from '@modules/notification/core/application/commands/send-notification/send-notification.command';

describe('OnUserCreatedHandler', () => {
  let handler: OnUserCreatedHandler;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const mockCommandBus = { execute: jest.fn().mockResolvedValue([]) };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'app.frontendUrl') return 'http://localhost:4200';
        if (key === 'app.emailVerificationPath') return '/verify-email';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnUserCreatedHandler,
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: ConfigService, useValue: mockConfigService },
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
  });
});
