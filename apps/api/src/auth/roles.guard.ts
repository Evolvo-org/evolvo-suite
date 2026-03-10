import {
  ForbiddenException,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthRole } from '@repo/shared';

import { requiredRolesKey } from './auth.decorators.js';
import type { AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class RolesGuard implements CanActivate {
  public constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AuthRole[]>(
      requiredRolesKey,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const currentRole = request.authUser?.role;

    if (!currentRole) {
      throw new ForbiddenException('Authenticated role is required.');
    }

    if (currentRole === 'admin') {
      return true;
    }

    if (requiredRoles.includes(currentRole)) {
      return true;
    }

    throw new ForbiddenException('Insufficient role permissions.');
  }
}