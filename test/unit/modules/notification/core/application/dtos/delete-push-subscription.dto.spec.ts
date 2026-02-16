import { validate } from 'class-validator';
import { DeletePushSubscriptionDto } from '@modules/notification/core/application/dtos/delete-push-subscription.dto';

describe('DeletePushSubscriptionDto', () => {
  const createValidDto = (): DeletePushSubscriptionDto => {
    const dto = new DeletePushSubscriptionDto();
    dto.endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';
    return dto;
  };

  describe('endpoint validation', () => {
    it('should pass with a valid URL', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with an invalid URL', async () => {
      const dto = createValidDto();
      dto.endpoint = 'not-a-url';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('endpoint');
    });

    it('should fail with an empty endpoint', async () => {
      const dto = createValidDto();
      dto.endpoint = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('endpoint');
    });
  });
});
