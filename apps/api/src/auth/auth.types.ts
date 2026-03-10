import type { Request } from 'express';
import type { AuthRole } from '@repo/shared';

export interface AuthenticatedUserSession {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: AuthRole;
  workspaceKey: string;
  expiresAt: string;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUserSession;
}

export interface SessionTokenPayload {
  version: 1;
  sub: string;
  email: string | null;
  displayName: string | null;
  role: AuthRole;
  workspaceKey: string;
  iat: number;
  exp: number;
}