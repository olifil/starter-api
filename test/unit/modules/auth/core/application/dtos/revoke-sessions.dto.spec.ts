import { validate } from 'class-validator';
import { RevokeSessionsDto } from '@modules/auth/core/application/dtos/revoke-sessions.dto';

describe('RevokeSessionsDto', () => {
  it('should pass with no userId (revoke own sessions)', async () => {
    const dto = new RevokeSessionsDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with a valid UUID v4', async () => {
    const dto = new RevokeSessionsDto();
    dto.userId = '550e8400-e29b-41d4-a716-446655440000';
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with an invalid UUID', async () => {
    const dto = new RevokeSessionsDto();
    dto.userId = 'not-a-uuid';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('userId');
  });
});
