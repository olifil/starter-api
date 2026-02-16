import { RolesGuard } from '@shared/authorization/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role, User } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (user?: any): ExecutionContext => {
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
      const context = createMockExecutionContext(undefined);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when no specific roles are required', () => {
      const user: Partial<User> = {
        id: '123',
        role: Role.AUTHENTICATED_USER,
      };
      const context = createMockExecutionContext(user);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined); // requiredRoles

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', () => {
      const user: Partial<User> = {
        id: '123',
        role: Role.ADMIN,
      };
      const context = createMockExecutionContext(user);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce([Role.ADMIN, Role.SUPER_ADMIN]); // requiredRoles

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user does not have required role', () => {
      const user: Partial<User> = {
        id: '123',
        role: Role.AUTHENTICATED_USER,
      };
      const context = createMockExecutionContext(user);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce([Role.ADMIN, Role.SUPER_ADMIN]); // requiredRoles

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny access when user is not authenticated', () => {
      const context = createMockExecutionContext(undefined);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce([Role.ADMIN]); // requiredRoles

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN when ADMIN is required', () => {
      const user: Partial<User> = {
        id: '123',
        role: Role.SUPER_ADMIN,
      };
      const context = createMockExecutionContext(user);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce([Role.ADMIN, Role.SUPER_ADMIN]); // requiredRoles

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
