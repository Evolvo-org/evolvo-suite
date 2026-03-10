export const authRoles = ['admin', 'operator', 'reviewer', 'viewer'] as const;

export type AuthRole = (typeof authRoles)[number];

export const authRoleCapabilities = {
  admin: [
    'projects:write',
    'workflow:write',
    'billing:write',
    'usage:read',
    'auth:manage',
  ],
  operator: ['projects:write', 'workflow:write', 'usage:read'],
  reviewer: ['workflow:review', 'usage:read'],
  viewer: ['projects:read'],
} as const satisfies Record<AuthRole, readonly string[]>;

export interface LoginRequest {
  userId: string;
  email?: string;
  displayName?: string;
  role: AuthRole;
  workspaceKey?: string;
}

export interface CurrentUserResponse {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: AuthRole;
  workspaceKey: string;
  capabilities: string[];
  sessionExpiresAt: string;
  adminBypassActive: boolean;
}

export interface LoginResponse {
  tokenType: 'Bearer';
  accessToken: string;
  currentUser: CurrentUserResponse;
}

export interface LogoutResponse {
  loggedOut: true;
}