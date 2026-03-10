import { createNestConfig } from '@repo/vitest-config/nest';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  createNestConfig(),
  defineConfig({
    test: {
      include: ['test/**/*.e2e-spec.ts'],
      exclude: ['src/**/*.spec.ts'],
      testTimeout: 15000,
    },
  }),
);
