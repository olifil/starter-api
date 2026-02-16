import { validate } from 'class-validator';
import { SendNotificationDto } from '@modules/notification/core/application/dtos/send-notification.dto';
import { NotificationChannel } from '@prisma/client';

describe('SendNotificationDto', () => {
  const createValidDto = (): SendNotificationDto => {
    const dto = new SendNotificationDto();
    dto.userIds = ['550e8400-e29b-41d4-a716-446655440000'];
    dto.type = 'WELCOME';
    dto.channels = [NotificationChannel.EMAIL];
    return dto;
  };

  describe('valid cases', () => {
    it('should pass with all required fields', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass without optional fields', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with optional variables and locale', async () => {
      const dto = createValidDto();
      dto.variables = { name: 'John', code: 42 };
      dto.locale = 'fr';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with multiple valid channels', async () => {
      const dto = createValidDto();
      dto.channels = [
        NotificationChannel.EMAIL,
        NotificationChannel.WEBSOCKET,
        NotificationChannel.SMS,
      ];
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('userIds validation', () => {
    it('should pass with an empty array (all users)', async () => {
      const dto = createValidDto();
      dto.userIds = [];
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with an invalid UUID', async () => {
      const dto = createValidDto();
      dto.userIds = ['not-a-uuid'];
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('userIds');
    });
  });

  describe('type validation', () => {
    it('should fail with an empty type', async () => {
      const dto = createValidDto();
      dto.type = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('type');
    });
  });

  describe('channels validation', () => {
    it('should fail with an invalid channel value', async () => {
      const dto = createValidDto();
      dto.channels = ['INVALID_CHANNEL' as NotificationChannel];
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('channels');
    });
  });
});
