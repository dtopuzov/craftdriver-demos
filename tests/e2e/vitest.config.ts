import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/spec/**/*.spec.ts', 'tests/e2e/specs/**/*.spec.ts'],
    globalSetup: ['tests/e2e/support/globalSetup.ts'],
    maxWorkers: 4,
    hookTimeout: 120_000,
    testTimeout: 120_000,
    reporters: ['default'],
  },
});
