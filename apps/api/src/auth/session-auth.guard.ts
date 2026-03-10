import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { isPublicRouteKey } from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  public constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(
      isPublicRouteKey,
      [context.getHandler(), context.getClass()],
    );

    if (isPublicRoute) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.authUser = this.authService.authenticateRequest(request);
    return true;
  }
}