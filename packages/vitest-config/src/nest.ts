import { defineConfig } from 'vitest/config';

export const createNestConfig = () =>
  defineConfig({
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.spec.ts'],
      setupFiles: ['reflect-metadata'],
      coverage: {
        provider: 'v8',
        reportsDirectory: 'coverage',
      },
    },
  });
