import { defineConfig } from 'vitest/config';

export const createNextConfig = () =>
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reportsDirectory: 'coverage',
      },
    },
  });
