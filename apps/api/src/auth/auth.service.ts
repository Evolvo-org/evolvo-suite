import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  authRoleCapabilities,
  authRoles,
  type CurrentUserResponse,
  type LoginRequest,
  type LoginResponse,
  type LogoutResponse,
} from '@repo/shared';

import type { ApplicationEnvironment } from '../config/environment.js';
import { LogsService } from '../logs/logs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

import type {
  AuthenticatedRequest,
  AuthenticatedUserSession,
  SessionTokenPayload,
} from './auth.types.js';

const bearerPrefix = 'Bearer ';
const defaultWorkspaceKey = 'default';

@Injectable()
export class AuthService {
  public constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<ApplicationEnvironment, true>,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(LogsService)
    private readonly logsService: LogsService,
  ) {}

  public async login(payload: LoginRequest): Promise<LoginResponse> {
    const authDevLoginEnabled = this.configService.get('authDevLoginEnabled', {
      infer: true,
    });

    if (!authDevLoginEnabled) {
      throw new ForbiddenException('Interactive auth login is disabled.');
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt =
      issuedAt + this.configService.get('authSessionTtlSeconds', { infer: true });
    const sessionPayload: SessionTokenPayload = {
      version: 1,
      sub: payload.userId.trim(),
      email: payload.email?.trim() ?? null,
      displayName: payload.displayName?.trim() ?? null,
      role: payload.role,
      workspaceKey: payload.workspaceKey?.trim() ?? defaultWorkspaceKey,
      iat: issuedAt,
      exp: expiresAt,
    };
    const accessToken = this.signToken(sessionPayload);
    const currentUser = await this.buildCurrentUser(sessionPayload);

    await this.logsService.writeLog({
      level: 'info',
      source: 'auth',
      userId: sessionPayload.sub,
      eventType: 'auth.login.issued',
      message: `Session issued for ${sessionPayload.sub}.`,
      payload: {
        role: sessionPayload.role,
        workspaceKey: sessionPayload.workspaceKey,
      },
    });

    return {
      tokenType: 'Bearer',
      accessToken,
      currentUser,
    };
  }

  public async logout(
    user: AuthenticatedUserSession,
  ): Promise<LogoutResponse> {
    await this.logsService.writeLog({
      level: 'info',
      source: 'auth',
      userId: user.userId,
      eventType: 'auth.logout.completed',
      message: `Session closed for ${user.userId}.`,
      payload: {
        workspaceKey: user.workspaceKey,
      },
    });

    return { loggedOut: true };
  }

  public authenticateRequest(
    request: Pick<AuthenticatedRequest, 'headers' | 'get'>,
  ): AuthenticatedUserSession {
    const token = this.getBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const payload = this.verifyToken(token);

    return {
      userId: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role,
      workspaceKey: payload.workspaceKey,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    };
  }

  public async getCurrentUser(
    user: AuthenticatedUserSession,
  ): Promise<CurrentUserResponse> {
    const exp = Math.floor(new Date(user.expiresAt).getTime() / 1000);

    return this.buildCurrentUser({
      version: 1,
      sub: user.userId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      workspaceKey: user.workspaceKey,
      iat: 0,
      exp,
    });
  }

  private async buildCurrentUser(
    payload: SessionTokenPayload,
  ): Promise<CurrentUserResponse> {
    const adminBypassActive = payload.role === 'admin'
      ? await this.isAdminBypassActive(payload.workspaceKey)
      : false;

    return {
      userId: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role,
      workspaceKey: payload.workspaceKey,
      capabilities: [...authRoleCapabilities[payload.role]],
      sessionExpiresAt: new Date(payload.exp * 1000).toISOString(),
      adminBypassActive,
    };
  }

  private async isAdminBypassActive(workspaceKey: string): Promise<boolean> {
    const globalBypassEnabled = this.configService.get('billingAdminBypass', {
      infer: true,
    });

    if (globalBypassEnabled) {
      return true;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { workspaceKey },
      select: { adminBypassActive: true },
    });

    return subscription?.adminBypassActive ?? false;
  }

  private signToken(payload: SessionTokenPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac(
      'sha256',
      this.configService.get('authSessionSecret', { infer: true }),
    )
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  private verifyToken(token: string): SessionTokenPayload {
    const parts = token.split('.');

    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid bearer token.');
    }

    const [encodedPayload, encodedSignature] = parts;
    const expectedSignature = createHmac(
      'sha256',
      this.configService.get('authSessionSecret', { infer: true }),
    )
      .update(encodedPayload)
      .digest();
    const providedSignature = Buffer.from(encodedSignature, 'base64url');

    if (
      providedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(providedSignature, expectedSignature)
    ) {
      throw new UnauthorizedException('Invalid bearer token signature.');
    }

    let parsedPayload: unknown;

    try {
      parsedPayload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      );
    } catch {
      throw new UnauthorizedException('Invalid bearer token payload.');
    }

    if (!this.isSessionTokenPayload(parsedPayload)) {
      throw new UnauthorizedException('Invalid bearer token payload.');
    }

    if (parsedPayload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Bearer token has expired.');
    }

    return parsedPayload;
  }

  private getBearerToken(
    request: Pick<AuthenticatedRequest, 'headers' | 'get'>,
  ): string | null {
    const headerValue = request.get?.('authorization') ?? request.headers.authorization;

    if (Array.isArray(headerValue)) {
      return this.normalizeBearerToken(headerValue[0]);
    }

    return this.normalizeBearerToken(headerValue);
  }

  private normalizeBearerToken(value: string | undefined): string | null {
    if (!value?.startsWith(bearerPrefix)) {
      return null;
    }

    const token = value.slice(bearerPrefix.length).trim();
    return token.length > 0 ? token : null;
  }

  private isSessionTokenPayload(value: unknown): value is SessionTokenPayload {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const payload = value as Partial<SessionTokenPayload>;

    return (
      payload.version === 1 &&
      typeof payload.sub === 'string' &&
      typeof payload.role === 'string' &&
      authRoles.includes(payload.role) &&
      typeof payload.workspaceKey === 'string' &&
      typeof payload.iat === 'number' &&
      typeof payload.exp === 'number' &&
      (payload.email === null || typeof payload.email === 'string') &&
      (payload.displayName === null || typeof payload.displayName === 'string')
    );
  }
}