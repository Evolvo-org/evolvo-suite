import { authRoleCapabilities, type AuthRole } from '@repo/shared';

export const projectWriteCapabilities = ['projects:write'] as const;
export const workflowCapabilities = [
  'workflow:write',
  'workflow:review',
] as const;
export const usageReadCapabilities = ['usage:read'] as const;

const routeCapabilityRules = [
  {
    matcher: /^\/projects\/new(?:\/|$)/,
    requiredCapabilities: projectWriteCapabilities,
  },
  {
    matcher: /^\/projects\/[^/]+\/development-plan(?:\/|$)/,
    requiredCapabilities: projectWriteCapabilities,
  },
  {
    matcher: /^\/projects\/[^/]+\/planning(?:\/|$)/,
    requiredCapabilities: projectWriteCapabilities,
  },
  {
    matcher: /^\/projects\/[^/]+\/settings(?:\/|$)/,
    requiredCapabilities: projectWriteCapabilities,
  },
  {
    matcher: /^\/projects\/[^/]+\/board(?:\/|$)/,
    requiredCapabilities: workflowCapabilities,
  },
  {
    matcher: /^\/projects\/[^/]+\/interventions(?:\/|$)/,
    requiredCapabilities: workflowCapabilities,
  },
  {
    matcher: /^\/projects\/[^/]+\/usage(?:\/|$)/,
    requiredCapabilities: usageReadCapabilities,
  },
];

export const isProtectedPath = (pathname: string): boolean => {
  return (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/projects' ||
    pathname.startsWith('/projects/')
  );
};

export const getRequiredCapabilitiesForPathname = (
  pathname: string,
): readonly string[] | null => {
  const matchedRule = routeCapabilityRules.find((rule) =>
    rule.matcher.test(pathname),
  );

  if (matchedRule) {
    return matchedRule.requiredCapabilities;
  }

  return isProtectedPath(pathname) ? [] : null;
};

export const canRoleAccessPath = (
  role: AuthRole,
  pathname: string,
): boolean => {
  const requiredCapabilities = getRequiredCapabilitiesForPathname(pathname);

  if (!requiredCapabilities || requiredCapabilities.length === 0) {
    return true;
  }

  const grantedCapabilities = new Set<string>(authRoleCapabilities[role]);

  return requiredCapabilities.some((capability) =>
    grantedCapabilities.has(capability),
  );
};
