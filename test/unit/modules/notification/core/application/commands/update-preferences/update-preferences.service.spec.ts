import { Test, TestingModule } from '@nestjs/testing';
import { UpdatePreferencesService } from '@modules/notification/core/application/commands/update-preferences/update-preferences.service';
import { UpdatePreferencesCommand } from '@modules/notification/core/application/commands/update-preferences/update-preferences.command';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from '@modules/notification/core/domain/repositories/notification-preference.repository.interface';
import { NotificationPreference } from '@modules/notification/core/domain/entities/notification-preference.entity';

describe('UpdatePreferencesService', () => {
  let service: UpdatePreferencesService;
  let preferenceRepository: jest.Mocked<INotificationPreferenceRepository>;

  const makePreference = (channel: string, enabled: boolean) =>
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
        UpdatePreferencesService,
        { provide: NOTIFICATION_PREFERENCE_REPOSITORY, useValue: mockPreferenceRepository },
      ],
    }).compile();

    service = module.get<UpdatePreferencesService>(UpdatePreferencesService);
    preferenceRepository = module.get(NOTIFICATION_PREFERENCE_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should upsert each preference and return DTOs', async () => {
      const savedEmail = makePreference('EMAIL', true);
      const savedSms = makePreference('SMS', false);

      preferenceRepository.upsert.mockResolvedValueOnce(savedEmail).mockResolvedValueOnce(savedSms);

      const command = new UpdatePreferencesCommand('user-1', [
        { channel: 'EMAIL', enabled: true },
        { channel: 'SMS', enabled: false },
      ]);

      const result = await service.execute(command);

      expect(preferenceRepository.upsert).toHaveBeenCalledTimes(2);
      expect(preferenceRepository.upsert).toHaveBeenCalledWith(expect.any(NotificationPreference));
      expect(result).toHaveLength(2);
      expect(result[0].channel).toBe('EMAIL');
      expect(result[0].enabled).toBe(true);
      expect(result[1].channel).toBe('SMS');
      expect(result[1].enabled).toBe(false);
    });

    it('should return empty array when no preferences provided', async () => {
      const command = new UpdatePreferencesCommand('user-1', []);
      const result = await service.execute(command);

      expect(result).toEqual([]);
      expect(preferenceRepository.upsert).not.toHaveBeenCalled();
    });

    it('should create preferences with the correct userId', async () => {
      const saved = makePreference('EMAIL', true);
      preferenceRepository.upsert.mockResolvedValue(saved);

      const command = new UpdatePreferencesCommand('user-1', [{ channel: 'EMAIL', enabled: true }]);
      await service.execute(command);

      expect(preferenceRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
    });
  });
});
