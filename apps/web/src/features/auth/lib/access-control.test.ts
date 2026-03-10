import { describe, expect, it } from 'vitest';

import {
  canRoleAccessPath,
  getRequiredCapabilitiesForPathname,
  isProtectedPath,
} from './access-control';

describe('access-control', () => {
  it('identifies protected app routes', () => {
    expect(isProtectedPath('/dashboard')).toBe(true);
    expect(isProtectedPath('/projects/project-1')).toBe(true);
    expect(isProtectedPath('/sign-in')).toBe(false);
  });

  it('maps routes to capability requirements', () => {
    expect(getRequiredCapabilitiesForPathname('/projects')).toEqual([]);
    expect(getRequiredCapabilitiesForPathname('/projects/new')).toEqual([
      'projects:write',
    ]);
    expect(
      getRequiredCapabilitiesForPathname('/projects/project-1/usage'),
    ).toEqual(['usage:read']);
    expect(
      getRequiredCapabilitiesForPathname('/projects/project-1/interventions'),
    ).toEqual(['workflow:write', 'workflow:review']);
    expect(getRequiredCapabilitiesForPathname('/sign-in')).toBeNull();
  });

  it('checks role access against the route capability rules', () => {
    expect(canRoleAccessPath('viewer', '/projects')).toBe(true);
    expect(canRoleAccessPath('viewer', '/projects/new')).toBe(false);
    expect(canRoleAccessPath('operator', '/projects/new')).toBe(true);
    expect(canRoleAccessPath('reviewer', '/projects/project-1/board')).toBe(
      true,
    );
    expect(canRoleAccessPath('reviewer', '/projects/project-1/planning')).toBe(
      false,
    );
    expect(canRoleAccessPath('viewer', '/projects/project-1/usage')).toBe(
      false,
    );
  });
});
