import { validate } from 'class-validator';
import { RefreshTokenDto } from '@modules/auth/core/application/dtos/refresh-token.dto';

describe('RefreshTokenDto', () => {
  const createValidDto = (): RefreshTokenDto => {
    const dto = new RefreshTokenDto();
    dto.refreshToken = 'valid-refresh-token';
    return dto;
  };

  describe('refreshToken validation', () => {
    it('should pass with a valid refreshToken', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with an empty refreshToken', async () => {
      const dto = createValidDto();
      dto.refreshToken = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('refreshToken');
    });
  });
});
