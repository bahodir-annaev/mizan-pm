import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let userRepository: any;

  function createMockContext(
    user: any,
    permissions?: string[],
  ): ExecutionContext {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(permissions as any);

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
    userRepository = {
      findById: jest.fn(),
    };
    guard = new PermissionsGuard(reflector, userRepository);
  });

  it('should allow access when no permissions are required', async () => {
    const context = createMockContext({ id: 'user-1' }, undefined);
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow access when required permissions are empty', async () => {
    const context = createMockContext({ id: 'user-1' }, []);
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user is not present', async () => {
    const context = createMockContext(undefined, ['project:create']);
    expect(await guard.canActivate(context)).toBe(false);
  });

  it('should deny access when user not found in repository', async () => {
    userRepository.findById.mockResolvedValue(null);
    const context = createMockContext({ id: 'user-1' }, ['project:create']);
    expect(await guard.canActivate(context)).toBe(false);
  });

  it('should allow access when user has required permission', async () => {
    userRepository.findById.mockResolvedValue({
      id: 'user-1',
      roles: [
        {
          name: 'member',
          permissions: [
            { name: 'project:read' },
            { name: 'project:create' },
          ],
        },
      ],
    });

    const context = createMockContext({ id: 'user-1' }, ['project:create']);
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user lacks required permission', async () => {
    userRepository.findById.mockResolvedValue({
      id: 'user-1',
      roles: [
        {
          name: 'viewer',
          permissions: [{ name: 'project:read' }],
        },
      ],
    });

    const context = createMockContext({ id: 'user-1' }, ['project:create']);
    expect(await guard.canActivate(context)).toBe(false);
  });

  it('should require ALL specified permissions', async () => {
    userRepository.findById.mockResolvedValue({
      id: 'user-1',
      roles: [
        {
          name: 'member',
          permissions: [{ name: 'project:read' }],
        },
      ],
    });

    const context = createMockContext({ id: 'user-1' }, [
      'project:read',
      'project:create',
    ]);
    expect(await guard.canActivate(context)).toBe(false);
  });

  it('should aggregate permissions across multiple roles', async () => {
    userRepository.findById.mockResolvedValue({
      id: 'user-1',
      roles: [
        { name: 'viewer', permissions: [{ name: 'project:read' }] },
        { name: 'manager', permissions: [{ name: 'project:create' }] },
      ],
    });

    const context = createMockContext({ id: 'user-1' }, [
      'project:read',
      'project:create',
    ]);
    expect(await guard.canActivate(context)).toBe(true);
  });
});
