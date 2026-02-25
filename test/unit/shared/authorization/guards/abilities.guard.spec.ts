import { AbilitiesGuard } from '@shared/authorization/guards/abilities.guard';
import { AbilityFactory } from '@shared/authorization/abilities/abilities.factory';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { Action } from '@shared/authorization/enums/action.enum';
import { Subject } from '@shared/authorization/enums/subject.enum';

describe('AbilitiesGuard', () => {
  let guard: AbilitiesGuard;
  let reflector: Reflector;
  let abilityFactory: AbilityFactory;

  beforeEach(() => {
    reflector = new Reflector();
    abilityFactory = new AbilityFactory();
    guard = new AbilitiesGuard(reflector, abilityFactory);
  });

  const createMockExecutionContext = (
    user?: any,
    _isPublic = false,
    _requiredAbilities: any[] = [],
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access to public routes', () => {
      const context = createMockExecutionContext(undefined, true);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when no required abilities are specified', () => {
      const user: Partial<User> = {
        id: '123',
        role: Role.AUTHENTICATED_USER,
      };
      const context = createMockExecutionContext(user);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined); // requiredAbilities
      jest.spyOn(reflector, 'get').mockReturnValue([]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required abilities', () => {
      const user: Partial<User> = {
        id: '123',
        role: Role.ADMIN,
      };
      const context = createMockExecutionContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false); // isPublic
      jest
        .spyOn(reflector, 'get')
        .mockReturnValue([{ action: Action.Read, subject: Subject.User }]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user does not have required abilities', () => {
      const user: Partial<User> = {
        id: '123',
        role: Role.AUTHENTICATED_USER,
      };
      const context = createMockExecutionContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false); // isPublic
      jest
        .spyOn(reflector, 'get')
        .mockReturnValue([{ action: Action.AccessConfig, subject: Subject.Config }]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN to access config', () => {
      const user: Partial<User> = {
        id: '123',
        role: Role.SUPER_ADMIN,
      };
      const context = createMockExecutionContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false); // isPublic
      jest
        .spyOn(reflector, 'get')
        .mockReturnValue([{ action: Action.AccessConfig, subject: Subject.Config }]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny ADMIN access to config', () => {
      const user: Partial<User> = {
        id: '123',
        role: Role.ADMIN,
      };
      const context = createMockExecutionContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false); // isPublic
      jest
        .spyOn(reflector, 'get')
        .mockReturnValue([{ action: Action.AccessConfig, subject: Subject.Config }]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
