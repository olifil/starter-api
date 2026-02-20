import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { OnUserDeletedHandler } from '@modules/notification/core/application/events/on-user-deleted/on-user-deleted.handler';
import { UserDeletedEvent } from '@modules/user/core/domain/events/user-deleted.event';
import { SendNotificationCommand } from '@modules/notification/core/application/commands/send-notification/send-notification.command';

describe('OnUserDeletedHandler', () => {
  let handler: OnUserDeletedHandler;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const mockCommandBus = { execute: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnUserDeletedHandler,
        { provide: CommandBus, useValue: mockCommandBus },
      ],
    }).compile();

    handler = module.get<OnUserDeletedHandler>(OnUserDeletedHandler);
    commandBus = module.get(CommandBus);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('should dispatch a SendNotificationCommand with correct arguments', async () => {
      const event = new UserDeletedEvent('user-1', 'john@example.com', 'John');

      await handler.handle(event);

      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(SendNotificationCommand));

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.userIds).toEqual(['user-1']);
      expect(command.type).toBe('account-deleted');
      expect(command.channels).toEqual(['EMAIL']);
      expect(command.variables).toMatchObject({ firstName: 'John' });
    });

    it('should use fr locale', async () => {
      const event = new UserDeletedEvent('user-1', 'john@example.com', 'John');

      await handler.handle(event);

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.locale).toBe('fr');
    });

    it('should send to the correct userId', async () => {
      const event = new UserDeletedEvent('user-42', 'jane@example.com', 'Jane');

      await handler.handle(event);

      const command = commandBus.execute.mock.calls[0][0] as SendNotificationCommand;
      expect(command.userIds).toEqual(['user-42']);
    });
  });
});
