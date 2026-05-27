// libs/shared/src/auth/permission.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSION_KEY = 'permission';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('未登录');
    }

    const hasPermission = user.roleCodes?.includes('owner') || 
                          user.roleCodes?.includes('admin') ||
                          user.permissions?.includes(requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException('无权限');
    }

    return true;
  }
}
