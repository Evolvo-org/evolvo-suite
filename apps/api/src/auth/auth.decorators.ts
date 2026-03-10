import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { AuthRole } from '@repo/shared';

import type { AuthenticatedRequest } from './auth.types.js';

export const isPublicRouteKey = 'auth:isPublicRoute';
export const requiredRolesKey = 'auth:requiredRoles';

export const PublicRoute = () => SetMetadata(isPublicRouteKey, true);

export const RequireRoles = (...roles: AuthRole[]) =>
  SetMetadata(requiredRolesKey, roles);

export const CurrentAuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.authUser;
  },
);