import { defineConfig } from 'tsup';

/**
 * Base tsup configuration shared across all publishable packages.
 * Override individual fields by passing them as the first argument.
 */
export const baseConfig = (overrides = {}) =>
  defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    target: 'es2022',
    splitting: false,
    ...overrides,
  });
