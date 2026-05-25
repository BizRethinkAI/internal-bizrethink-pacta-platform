import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts', '**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Allow `npm test` to pass when no tests exist yet (bootstrap period).
    // Remove once at least one test file lands (will be V15-V18 Zod schemas).
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['server-only/**/*.ts', 'feature-flags.ts', 'index.ts'],
      exclude: [
        '**/*.test.ts',
        '**/__tests__/**',
        '**/*.d.ts',
        '**/node_modules/**',
        'branding/**',
        'prisma-extensions/**',
      ],
      // TODO: enable thresholds once P0 coverage targets are met (per COVERAGE-PLAN-2026-05-25.md §6).
      // Target: 80% lines/functions for packages/bizrethink/ after P0 (~85h of work).
    },
  },
});
