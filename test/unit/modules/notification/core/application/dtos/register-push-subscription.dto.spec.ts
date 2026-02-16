import { validate } from 'class-validator';
import { RegisterPushSubscriptionDto } from '@modules/notification/core/application/dtos/register-push-subscription.dto';

describe('RegisterPushSubscriptionDto', () => {
  const createValidDto = (): RegisterPushSubscriptionDto => {
    const dto = new RegisterPushSubscriptionDto();
    dto.endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';
    dto.p256dh = 'BNcRdreALRFXTkOOUHK1EtK2wtZ5s3liwKKuBCBe';
    dto.auth = 'tBHItJI5svbpez7KI4CCXg';
    return dto;
  };

  describe('valid cases', () => {
    it('should pass with all valid fields', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('endpoint validation', () => {
    it('should fail with an invalid URL', async () => {
      const dto = createValidDto();
      dto.endpoint = 'not-a-url';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('endpoint');
    });
  });

  describe('p256dh validation', () => {
    it('should fail with an empty p256dh', async () => {
      const dto = createValidDto();
      dto.p256dh = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('p256dh');
    });
  });

  describe('auth validation', () => {
    it('should fail with an empty auth', async () => {
      const dto = createValidDto();
      dto.auth = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('auth');
    });
  });
});
