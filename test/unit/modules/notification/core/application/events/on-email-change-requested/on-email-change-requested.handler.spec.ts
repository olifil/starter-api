import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { OnEmailChangeRequestedHandler } from '@modules/notification/core/application/events/on-email-change-requested/on-email-change-requested.handler';
import { EmailChangeRequestedEvent } from '@modules/auth/core/domain/events/email-change-requested.event';
import { SendNotificationCommand } from '@modules/notification/core/application/commands/send-notification/send-notification.command';

describe('OnEmailChangeRequestedHandler', () => {
  let handler: OnEmailChangeRequestedHandler;
  let commandBus: jest.Mocked<CommandBus>;

  const frontendUrl = 'http://localhost:3000';

  beforeEach(async () => {
    const mockCommandBus = { execute: jest.fn().mockResolvedValue([]) };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'app.frontendUrl') return frontendUrl;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnEmailChangeRequestedHandler,
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    handler = module.get<OnEmailChangeRequestedHandler>(OnEmailChangeRequestedHandler);
    commandBus = module.get(CommandBus);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    const createEvent = (): EmailChangeRequestedEvent =>
      new EmailChangeRequestedEvent('user-1', 'John', 'new@example.com', 'abc123token', '1h');

    it('should dispatch a SendNotificationCommand', async () => {
      await handler.handle(createEvent());

      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(SendNotificationCommand));
    });

    it('should send notification to the correct user', async () => {
      await handler.handle(createEvent());

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.userIds).toEqual(['user-1']);
    });

    it('should use the email-change-verification notification type', async () => {
      await handler.handle(createEvent());

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.type).toBe('email-change-verification');
    });

    it('should send via EMAIL channel only', async () => {
      await handler.handle(createEvent());

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.channels).toEqual(['EMAIL']);
    });

    it('should include firstName and expiresIn in template variables', async () => {
      await handler.handle(createEvent());

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.variables).toMatchObject({
        firstName: 'John',
        expiresIn: '1h',
      });
    });

    it('should build confirmationLink from frontendUrl and token', async () => {
      await handler.handle(createEvent());

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.variables?.['confirmationLink']).toBe(
        `${frontendUrl}/confirm-email-change?token=abc123token`,
      );
    });

    it('should route the email to the new address via recipientEmailOverride', async () => {
      await handler.handle(createEvent());

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.recipientEmailOverride).toBe('new@example.com');
    });
  });
});
