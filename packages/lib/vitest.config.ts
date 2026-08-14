import macrosPlugin from 'vite-plugin-babel-macros';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Transform lingui macros (e.g. `msg`) used by the code under test.
  plugins: [macrosPlugin()],
  test: {
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'server-only/**/*.ts',
        'universal/**/*.ts',
        'client-only/**/*.ts',
        'constants/**/*.ts',
        'types/**/*.ts',
      ],
      exclude: ['**/*.test.ts', '**/__tests__/**', '**/*.d.ts', '**/node_modules/**'],
      // TODO: enable thresholds once P0 coverage targets are met (per COVERAGE-PLAN-2026-05-25.md §6).
      // Target: 60% lines/functions for packages/lib/ (mostly upstream code).
    },
  },
});
