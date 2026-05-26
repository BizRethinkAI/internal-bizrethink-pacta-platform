import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts', '**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Allow `npm test` to pass when no tests exist yet (bootstrap period).
    // Remove once at least one test file lands (will be V15-V18 Zod schemas).
    passWithNoTests: true,
    // Stub @lingui/core/macro at test time. The `msg` tagged-template
    // macro is normally transformed to a MessageDescriptor at build time
    // by the lingui SWC plugin; vitest doesn't run that transform, so any
    // module that uses `msg\`...\`` (e.g. @documenso/lib/constants/i18n)
    // throws "msg is not a function" on import. The stub returns a
    // shape-compatible object — sufficient for schema-parity tests that
    // never actually render translated strings.
    setupFiles: ['./regression-tests/lingui-macro-stub.ts'],
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
