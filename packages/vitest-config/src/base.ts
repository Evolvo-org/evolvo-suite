import { defineConfig } from 'vitest/config';

export const createBaseConfig = () =>
  defineConfig({
    test: {
      globals: true,
      coverage: {
        provider: 'v8',
        reportsDirectory: 'coverage',
      },
    },
  });
