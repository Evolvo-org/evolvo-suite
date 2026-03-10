export const authSessionCookieName = 'evolvo_session_token';
export const authRoleCookieName = 'evolvo_session_role';
export const authAccessTokenStorageKey = 'evolvo.access-token';
export const defaultAuthenticatedPath = '/dashboard';

export const sanitizeReturnTo = (value?: string | null): string => {
  if (!value?.startsWith('/')) {
    return defaultAuthenticatedPath;
  }

  if (
    value.startsWith('//') ||
    value.startsWith('/api') ||
    value.startsWith('/sign-in')
  ) {
    return defaultAuthenticatedPath;
  }

  return value;
};
