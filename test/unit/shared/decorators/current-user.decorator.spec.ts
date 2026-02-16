import { CurrentUser } from '@shared/decorators/current-user.decorator';

describe('CurrentUser Decorator', () => {
  it('should be defined', () => {
    // CurrentUser is a NestJS parameter decorator
    // It is tested indirectly through integration tests where it extracts
    // the user from the request object after JWT authentication
    expect(CurrentUser).toBeDefined();
    expect(typeof CurrentUser).toBe('function');
  });

  // Note: Direct testing of NestJS parameter decorators is not straightforward
  // as they rely on the framework's internal mechanism.
  // The functionality is verified through integration tests in:
  // - test/integration/user/user-profile.integration-spec.ts (GET /users/me, PUT /users/me)
  // - test/integration/auth/auth.integration-spec.ts (JWT authentication tests)
  // where the decorator successfully extracts the authenticated user from requests
});
