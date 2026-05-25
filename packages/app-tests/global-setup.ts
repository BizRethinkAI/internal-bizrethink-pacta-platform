import type { FullConfig } from '@playwright/test';

/**
 * Production-safety guardrail. Throws BEFORE any test runs if the configured
 * baseURL is not localhost / 127.0.0.1 / ::1. This prevents the catastrophic
 * case where a developer accidentally points the test suite at a staging or
 * (worse) production URL and the tests mutate real data via the seedUser etc.
 * helpers.
 *
 * Escape hatch: set `PLAYWRIGHT_ALLOW_NON_LOCAL=1` if you genuinely intend to
 * run against a non-local target (e.g. a staging deployment in CI). The
 * variable must be set explicitly — accidental targeting is the failure mode
 * this guard is designed to catch.
 *
 * See COVERAGE-PLAN-2026-05-25.md §6 T6 + feedback-playwright-regression-gate
 * memory rule for the rationale.
 */
export default function globalSetup(config: FullConfig) {
  if (process.env.PLAYWRIGHT_ALLOW_NON_LOCAL === '1') {
    console.warn(
      '[playwright global-setup] PLAYWRIGHT_ALLOW_NON_LOCAL=1 — prod-safety guard bypassed. ' +
        'Tests will run against:',
      config.projects[0]?.use?.baseURL,
    );
    return;
  }

  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) {
    return;
  }

  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    throw new Error(
      `[playwright global-setup] baseURL "${baseURL}" is not a valid URL. ` +
        'Cannot apply prod-safety guard; refusing to run.',
    );
  }

  const localHostnames = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
  if (!localHostnames.has(url.hostname)) {
    throw new Error(
      `[playwright global-setup] PROD-SAFETY GUARD: baseURL "${baseURL}" resolves to ` +
        `hostname "${url.hostname}", which is not localhost. ` +
        'These tests MUTATE the database via seedUser/seedOrganisation/etc — running them ' +
        'against staging or production would corrupt real data. ' +
        'If this is intentional (e.g. testing against an ephemeral CI deployment), ' +
        'set PLAYWRIGHT_ALLOW_NON_LOCAL=1 to bypass.',
    );
  }
}
