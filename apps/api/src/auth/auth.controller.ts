import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import type { LoginRequest } from '@repo/shared';
import { loginSchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { CurrentAuthUser, PublicRoute } from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import type { AuthenticatedUserSession } from './auth.types.js';

@Controller('auth')
export class AuthController {
  public constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @PublicRoute()
  @Post('login')
  public async login(
    @Body(new ZodValidationPipe(loginSchema))
    body: LoginRequest,
  ) {
    const session = await this.authService.login(body);

    return {
      success: true as const,
      message: 'Authenticated successfully.',
      data: session,
    };
  }

  @UseGuards(SessionAuthGuard)
  @Get('current-user')
  public getCurrentUser(
    @CurrentAuthUser() user: AuthenticatedUserSession,
  ) {
    return this.authService.getCurrentUser(user);
  }

  @UseGuards(SessionAuthGuard)
  @Post('logout')
  public async logout(
    @CurrentAuthUser() user: AuthenticatedUserSession,
  ) {
    const result = await this.authService.logout(user);

    return {
      success: true as const,
      message: 'Logged out successfully.',
      data: result,
    };
  }
}