import { Test, TestingModule } from '@nestjs/testing';
import { GetPreferencesHandler } from '@modules/notification/core/application/queries/get-preferences/get-preferences.handler';
import { GetPreferencesQuery } from '@modules/notification/core/application/queries/get-preferences/get-preferences.query';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from '@modules/notification/core/domain/repositories/notification-preference.repository.interface';
import { NotificationPreference } from '@modules/notification/core/domain/entities/notification-preference.entity';

describe('GetPreferencesHandler', () => {
  let handler: GetPreferencesHandler;
  let preferenceRepository: jest.Mocked<INotificationPreferenceRepository>;

  const makePreference = (channel: string, enabled = true) =>
    new NotificationPreference({
      id: `pref-${channel}`,
      userId: 'user-1',
      channel: channel as 'EMAIL',
      enabled,
    });

  beforeEach(async () => {
    const mockPreferenceRepository: jest.Mocked<INotificationPreferenceRepository> = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndChannel: jest.fn(),
      upsert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPreferencesHandler,
        { provide: NOTIFICATION_PREFERENCE_REPOSITORY, useValue: mockPreferenceRepository },
      ],
    }).compile();

    handler = module.get<GetPreferencesHandler>(GetPreferencesHandler);
    preferenceRepository = module.get(NOTIFICATION_PREFERENCE_REPOSITORY);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return all preferences for a user', async () => {
      const preferences = [
        makePreference('EMAIL', true),
        makePreference('SMS', false),
        makePreference('WEBSOCKET', true),
      ];
      preferenceRepository.findByUserId.mockResolvedValue(preferences);

      const query = new GetPreferencesQuery('user-1');
      const result = await handler.execute(query);

      expect(preferenceRepository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(3);
    });

    it('should map preferences to DTOs', async () => {
      const preferences = [makePreference('EMAIL', true)];
      preferenceRepository.findByUserId.mockResolvedValue(preferences);

      const query = new GetPreferencesQuery('user-1');
      const result = await handler.execute(query);

      expect(result[0].channel).toBe('EMAIL');
      expect(result[0].enabled).toBe(true);
    });

    it('should return empty array when user has no preferences', async () => {
      preferenceRepository.findByUserId.mockResolvedValue([]);

      const query = new GetPreferencesQuery('user-1');
      const result = await handler.execute(query);

      expect(result).toEqual([]);
    });
  });
});
