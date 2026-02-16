import { AuthHttpController } from '@modules/auth/interface/http-controller/auth.http-controller';

/**
 * @nestjs/throttler v6 stores metadata with keys suffixed by throttler name:
 * - Class: `THROTTLER:SKIP{name}` → true (from @SkipThrottle({ name: true }))
 * - Method: `THROTTLER:TTL{name}` exists (from @Throttle({ name: {} }))
 */
const SKIP_KEY = 'THROTTLER:SKIPstrict';
const TTL_KEY = 'THROTTLER:TTLstrict';

describe('AuthHttpController — throttle decorators', () => {
  describe('@SkipThrottle({ strict: true }) on class', () => {
    it('should skip the strict throttler at the class level', () => {
      const skip = Reflect.getMetadata(SKIP_KEY, AuthHttpController) as boolean | undefined;

      expect(skip).toBe(true);
    });
  });

  describe('@Throttle({ strict: {} }) on sensitive routes', () => {
    const sensitiveRoutes = ['register', 'login', 'forgotPassword'];

    it.each(sensitiveRoutes)('should enable strict throttler on %s', (method) => {
      const descriptor = Object.getOwnPropertyDescriptor(AuthHttpController.prototype, method);
      const keys = Reflect.getMetadataKeys(descriptor!.value as object) as string[];

      expect(keys).toContain(TTL_KEY);
    });
  });

  describe('non-sensitive routes should NOT have strict throttler', () => {
    const nonSensitiveRoutes = ['refresh', 'resetPassword', 'verifyEmail'];

    it.each(nonSensitiveRoutes)('should not have strict throttler on %s', (method) => {
      const descriptor = Object.getOwnPropertyDescriptor(AuthHttpController.prototype, method);
      const keys = Reflect.getMetadataKeys(descriptor!.value as object) as string[];

      expect(keys).not.toContain(TTL_KEY);
    });
  });
});
