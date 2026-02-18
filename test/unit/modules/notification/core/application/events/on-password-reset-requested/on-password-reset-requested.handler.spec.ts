import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { OnPasswordResetRequestedHandler } from '@modules/notification/core/application/events/on-password-reset-requested/on-password-reset-requested.handler';
import { PasswordResetRequestedEvent } from '@modules/auth/core/domain/events/password-reset-requested.event';
import { SendNotificationCommand } from '@modules/notification/core/application/commands/send-notification/send-notification.command';

describe('OnPasswordResetRequestedHandler', () => {
  let handler: OnPasswordResetRequestedHandler;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const mockCommandBus = { execute: jest.fn().mockResolvedValue([]) };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'app.frontendUrl') return 'http://localhost:3000';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnPasswordResetRequestedHandler,
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    handler = module.get<OnPasswordResetRequestedHandler>(OnPasswordResetRequestedHandler);
    commandBus = module.get(CommandBus);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('should dispatch a SendNotificationCommand with correct arguments', async () => {
      const event = new PasswordResetRequestedEvent(
        'user-1',
        'john@example.com',
        'John',
        'abc123token',
        '15m',
      );

      await handler.handle(event);

      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(SendNotificationCommand));

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.userIds).toEqual(['user-1']);
      expect(command.type).toBe('password-reset');
      expect(command.channels).toEqual(['EMAIL']);
      expect(command.variables).toMatchObject({
        firstName: 'John',
        expiresIn: '15m',
      });
    });

    it('should build resetLink from appUrl and token', async () => {
      const event = new PasswordResetRequestedEvent(
        'user-1',
        'john@example.com',
        'John',
        'mytoken',
        '15m',
      );

      await handler.handle(event);

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.variables?.['resetLink']).toBe(
        'http://localhost:3000/reset-password?token=mytoken',
      );
    });
  });
});
