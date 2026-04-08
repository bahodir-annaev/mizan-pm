import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  function createMockContext(user: any, roles?: string[]): ExecutionContext {
    const mockReflector = reflector;
    // We override the reflector behavior per-test
    jest.spyOn(mockReflector, 'getAllAndOverride').mockReturnValue(roles as any);

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
    } as any;
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are required', () => {
    const context = createMockContext({ roles: ['member'] }, undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when required roles are empty', () => {
    const context = createMockContext({ roles: ['member'] }, []);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user has no roles', () => {
    const context = createMockContext({ roles: [] }, ['admin']);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny access when user is not present', () => {
    const context = createMockContext(undefined, ['admin']);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow owner to access admin-restricted route', () => {
    const context = createMockContext({ roles: ['owner'] }, ['admin']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow admin to access manager-restricted route', () => {
    const context = createMockContext({ roles: ['admin'] }, ['manager']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny viewer access to admin-restricted route', () => {
    const context = createMockContext({ roles: ['viewer'] }, ['admin']);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny member access to admin-restricted route', () => {
    const context = createMockContext({ roles: ['member'] }, ['admin']);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow member access to member-restricted route', () => {
    const context = createMockContext({ roles: ['member'] }, ['member']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should use highest role from multiple roles', () => {
    const context = createMockContext(
      { roles: ['viewer', 'admin'] },
      ['manager'],
    );
    expect(guard.canActivate(context)).toBe(true);
  });
});
