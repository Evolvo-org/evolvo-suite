export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const formatContext = (context?: Record<string, unknown>): string => {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }

  return ` ${JSON.stringify(context)}`;
};

export const log = (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void => {
  const payload = `[runtime] ${message}${formatContext(context)}`;

  if (level === 'error') {
    console.error(payload);
    return;
  }

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  if (level === 'debug') {
    console.debug(payload);
    return;
  }

  console.info(payload);
};
