import { AuthHttpController } from '@modules/auth/interface/http-controller/auth.http-controller';

/**
 * @nestjs/throttler v6 stocke les métadonnées avec des clés suffixées par le nom du throttler :
 * - `THROTTLER:TTL{name}`  → présent si @Throttle({ name: {} }) est appliqué
 * - `THROTTLER:SKIP{name}` → true si @SkipThrottle({ name: true }) est appliqué
 *
 * Pattern de sécurité : chaque route sensible porte explicitement @Throttle({ strict: {} }),
 * et chaque route non-sensible porte @SkipThrottle({ strict: true }).
 * Il n'y a PAS de @SkipThrottle au niveau de la classe (ce qui écraserait tout).
 */
const SKIP_KEY = 'THROTTLER:SKIPstrict';
const TTL_KEY = 'THROTTLER:TTLstrict';

describe('AuthHttpController — throttle decorators', () => {
  describe('routes soumises au throttler strict (@Throttle({ strict: {} }))', () => {
    const sensitiveRoutes = ['register', 'login', 'forgotPassword'];

    it.each(sensitiveRoutes)('should enable strict throttler on %s (TTL key present)', (method) => {
      const descriptor = Object.getOwnPropertyDescriptor(AuthHttpController.prototype, method);
      const keys = Reflect.getMetadataKeys(descriptor!.value as object) as string[];

      expect(keys).toContain(TTL_KEY);
    });

    it.each(sensitiveRoutes)(
      'should NOT skip strict throttler on %s (no SKIP key on method)',
      (method) => {
        const descriptor = Object.getOwnPropertyDescriptor(AuthHttpController.prototype, method);
        const skip = Reflect.getMetadata(SKIP_KEY, descriptor!.value as object) as
          | boolean
          | undefined;

        expect(skip).not.toBe(true);
      },
    );
  });

  describe('routes exemptées du throttler strict (@SkipThrottle({ strict: true }))', () => {
    const nonSensitiveRoutes = ['refresh', 'resetPassword', 'verifyEmail', 'logout', 'revokeSessions'];

    it.each(nonSensitiveRoutes)(
      'should skip strict throttler on %s (SKIP key = true on method)',
      (method) => {
        const descriptor = Object.getOwnPropertyDescriptor(AuthHttpController.prototype, method);
        const skip = Reflect.getMetadata(SKIP_KEY, descriptor!.value as object) as
          | boolean
          | undefined;

        expect(skip).toBe(true);
      },
    );

    it.each(nonSensitiveRoutes)(
      'should NOT have strict throttler TTL key on %s',
      (method) => {
        const descriptor = Object.getOwnPropertyDescriptor(AuthHttpController.prototype, method);
        const keys = Reflect.getMetadataKeys(descriptor!.value as object) as string[];

        expect(keys).not.toContain(TTL_KEY);
      },
    );
  });

  describe('class-level configuration', () => {
    it('should NOT have a class-level @SkipThrottle({ strict: true })', () => {
      // Le skip doit être géré route par route, pas au niveau de la classe.
      // Avoir un skip au niveau classe empêcherait le throttler de fonctionner
      // même pour les routes qui portent @Throttle({ strict: {} }).
      const skip = Reflect.getMetadata(SKIP_KEY, AuthHttpController) as boolean | undefined;

      expect(skip).not.toBe(true);
    });
  });
});
