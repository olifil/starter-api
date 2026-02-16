import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { NotificationPreferenceHttpController } from '@modules/notification/interface/http-controller/notification-preference.http-controller';
import { GetPreferencesQuery } from '@modules/notification/core/application/queries/get-preferences/get-preferences.query';
import { UpdatePreferencesCommand } from '@modules/notification/core/application/commands/update-preferences/update-preferences.command';

describe('NotificationPreferenceHttpController', () => {
  let controller: NotificationPreferenceHttpController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationPreferenceHttpController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    controller = module.get<NotificationPreferenceHttpController>(
      NotificationPreferenceHttpController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyPreferences', () => {
    it('should dispatch GetPreferencesQuery and return result', async () => {
      const user = { userId: 'user-1' };
      const expected = [{ channel: 'EMAIL', enabled: true }];
      queryBus.execute.mockResolvedValue(expected);

      const result = await controller.getMyPreferences(user);

      expect(queryBus.execute).toHaveBeenCalledWith(new GetPreferencesQuery('user-1'));
      expect(result).toBe(expected);
    });
  });

  describe('updateMyPreferences', () => {
    it('should dispatch UpdatePreferencesCommand and return result', async () => {
      const user = { userId: 'user-1' };
      const dto = {
        preferences: [
          { channel: 'EMAIL', enabled: true },
          { channel: 'SMS', enabled: false },
        ],
      };
      const expected = [{ channel: 'EMAIL', enabled: true }];
      commandBus.execute.mockResolvedValue(expected);

      const result = await controller.updateMyPreferences(user, dto as never);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdatePreferencesCommand('user-1', dto.preferences),
      );
      expect(result).toBe(expected);
    });
  });
});
