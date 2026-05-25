import { test } from '@playwright/test';

import {
  resetAllBizRethinkSingletons,
  seedSsoProviderConfig,
} from '@documenso/prisma/seed/bizrethink';

/**
 * E2 SKELETON from COVERAGE-PLAN-2026-05-25.md — SSO sign-in (overlay 014).
 *
 * NOT YET IMPLEMENTED. This file documents the intended shape so the next
 * session can fill in the body. The setup work + OAuth-callback interception
 * pattern needs design before the tests can run reliably.
 *
 * Plan for each provider (google, microsoft, oidc):
 *
 * 1. Setup phase:
 *    - seedSsoProviderConfig({ provider, enabled: true, clientId, clientSecret,
 *        ...(provider === 'oidc' && { oidcWellKnownUrl: '...' }) })
 *    - Invalidate the provider config cache so the new row takes effect.
 *
 * 2. Disabled-provider variant:
 *    - seedSsoProviderConfig({ provider, enabled: false })
 *    - Navigate to /signin
 *    - Assert the provider's button is NOT visible
 *
 * 3. Enabled-provider variant:
 *    - seedSsoProviderConfig({ provider, enabled: true, clientId+secret })
 *    - Navigate to /signin
 *    - Assert the provider's button IS visible + clickable
 *    - Click the button → assert navigation begins toward OAuth start URL
 *      (don't follow — just verify the redirect attempt)
 *
 * 4. Callback-stub variant (the hardest):
 *    - Use page.route() to intercept the OAuth provider's authorize+callback
 *      and respond with a synthetic callback that contains a valid code/state
 *    - Verify upstream's callback handler creates a session (cookie set)
 *    - Verify the user lands on / after auth
 *
 * Key references:
 *    - apps/remix/app/routes/_unauthenticated+/signin.tsx (provider buttons)
 *    - packages/auth/server/routes/oauth.ts (callback handler)
 *    - packages/auth/server/lib/utils/handle-oauth-{authorize,callback}-url.ts
 *      (these have inline mods per overlay 014 to use sso-provider-config)
 *
 * Why deferred:
 *    - Real OAuth round-trip is brittle in CI (rate limits, account creds).
 *    - Stub-callback approach needs careful page.route() pattern + cookie
 *      surgery that's spec-specific per provider.
 *    - Pure DB-config tests are already covered by V19 (sso-provider-config
 *      unit tests).
 */
test.describe.skip('BizRethink overlay 014 — SSO sign-in (DB-backed providers)', () => {
  test.beforeEach(async () => {
    await resetAllBizRethinkSingletons();
  });

  test('TODO: google disabled → button hidden', async () => {
    await seedSsoProviderConfig({ provider: 'google', enabled: false });
    // ...
  });

  test('TODO: google enabled → button visible + clickable', async () => {
    await seedSsoProviderConfig({
      provider: 'google',
      enabled: true,
      clientId: 'fake-google-client-id',
      clientSecret: 'fake-google-client-secret',
    });
    // ...
  });

  test('TODO: microsoft enabled → button visible + clickable', async () => {
    // Same pattern as google.
  });

  test('TODO: oidc enabled with wellKnownUrl → button visible', async () => {
    // Same pattern; additionally seed oidcWellKnownUrl + oidcProviderLabel.
  });

  test('TODO: stubbed callback creates session', async () => {
    // page.route('**/oauth/callback*', ...) to inject synthetic response.
  });
});
