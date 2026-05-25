import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Regression guards for the auth/routes/* inline modifications:
 *   - callback.ts (overlay 014): async SSO provider getters
 *   - email-password.ts (overlay 012 + 028 + 048b): signup-disabled,
 *     domain-allowlist, invite-required gates
 *
 * Source-presence guards. Behavioural tests deferred — auth-route tests
 * need a full TRPC context + session middleware fixture, which is the
 * scope of Task #14 in the project tracker. These guards ensure the
 * inline-mod imports + key call sites survive the merge.
 */
const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf-8');

describe('auth/routes/callback.ts — overlay 014 SSO async regression guard', () => {
  const source = read('callback.ts');

  it('contains the overlay 014 marker', () => {
    expect(source).toMatch(/overlay 014|BizRethink/);
  });

  it('uses async getters (getGoogleAuthOptions etc.) per overlay 014', () => {
    expect(source).toMatch(/getGoogleAuthOptions|getMicrosoftAuthOptions|getOidcAuthOptions/);
  });
});

describe('auth/routes/email-password.ts — overlays 012 + 028 + 048b guards', () => {
  const source = read('email-password.ts');

  it('imports isSignupDisabled from bizrethink (overlay 028)', () => {
    expect(source).toMatch(
      /@bizrethink\/customizations\/server-only\/signup-config/,
    );
  });

  it('overlay 012 — uses async isEmailDomainAllowedForSignup', () => {
    expect(source).toMatch(/await isEmailDomainAllowedForSignup/);
  });

  it('overlay 048b — uses isInviteRequiredForSignup gate', () => {
    expect(source).toMatch(/isInviteRequiredForSignup/);
  });

  it('overlay 048b — checks for pending OrganisationMemberInvite when gated', () => {
    // The gated path queries organisationMemberInvite to enforce the
    // require-invite-when-domain-gated policy. If this is removed, the
    // B2B security barrier is gone and any allowed-domain email can
    // self-signup — a security regression we want caught immediately.
    expect(source).toMatch(/organisationMemberInvite|findFirst/);
  });
});
