import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@modules/auth/interface/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new JwtAuthGuard(reflector);
  });

  const createMockExecutionContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    }) as unknown as ExecutionContext;

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true for public routes', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const context = createMockExecutionContext();
    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('should delegate to super.canActivate for non-public routes', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const context = createMockExecutionContext();
    const superCanActivate = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    superCanActivate.mockRestore();
  });

  it('should delegate to super.canActivate when isPublic is undefined', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = createMockExecutionContext();
    const superCanActivate = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    superCanActivate.mockRestore();
  });
});
