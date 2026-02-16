import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdatePreferencesDto } from '@modules/notification/core/application/dtos/update-preferences.dto';
import { NotificationChannel } from '@prisma/client';

describe('UpdatePreferencesDto', () => {
  const createValidDto = (): UpdatePreferencesDto => {
    return plainToInstance(UpdatePreferencesDto, {
      preferences: [{ channel: NotificationChannel.EMAIL, enabled: true }],
    });
  };

  describe('valid cases', () => {
    it('should pass with a valid single preference', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with multiple valid preferences', async () => {
      const dto = plainToInstance(UpdatePreferencesDto, {
        preferences: [
          { channel: NotificationChannel.EMAIL, enabled: true },
          { channel: NotificationChannel.SMS, enabled: false },
          { channel: NotificationChannel.WEBSOCKET, enabled: true },
        ],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('channel validation', () => {
    it('should fail with an invalid channel enum value', async () => {
      const dto = plainToInstance(UpdatePreferencesDto, {
        preferences: [{ channel: 'INVALID_CHANNEL', enabled: true }],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('enabled validation', () => {
    it('should fail with a non-boolean enabled value', async () => {
      const dto = plainToInstance(UpdatePreferencesDto, {
        preferences: [{ channel: NotificationChannel.EMAIL, enabled: 'yes' }],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
