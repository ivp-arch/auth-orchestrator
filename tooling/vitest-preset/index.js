import { defineConfig } from 'vitest/config';

/**
 * Base vitest configuration shared across all packages.
 * Override individual fields by passing them through overrides.
 */
export const baseTestConfig = (overrides = {}) =>
  defineConfig({
    test: {
      globals: true,
      environment: 'node',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: ['**/dist/**', '**/node_modules/**', '**/*.config.*', '**/tests/**'],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
      },
      ...(overrides.test ?? {}),
    },
  });
