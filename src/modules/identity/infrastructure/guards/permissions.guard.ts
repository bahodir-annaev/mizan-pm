import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user-repository.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user: reqUser } = context.switchToHttp().getRequest();
    if (!reqUser) {
      return false;
    }

    const user = await this.userRepository.findById(reqUser.id);
    if (!user) {
      return false;
    }

    const userPermissions = new Set<string>();
    for (const role of user.roles) {
      for (const perm of role.permissions || []) {
        userPermissions.add(perm.name);
      }
    }

    return requiredPermissions.every((perm) => userPermissions.has(perm));
  }
}
