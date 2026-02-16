import { validate } from 'class-validator';
import { VerifyEmailDto } from '@modules/auth/core/application/dtos/verify-email.dto';

describe('VerifyEmailDto', () => {
  const createValidDto = (): VerifyEmailDto => {
    const dto = new VerifyEmailDto();
    dto.token = 'valid-verification-token';
    return dto;
  };

  describe('token validation', () => {
    it('should pass with a valid token', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with an empty token', async () => {
      const dto = createValidDto();
      dto.token = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('token');
    });
  });
});
