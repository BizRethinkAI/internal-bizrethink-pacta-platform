import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Regression guards for the auth/routes/* inline modifications:
 *   - callback.ts (overlay 014): async SSO provider getters
 *   - email-password.ts (overlay 012 + 028 + 048b + 074): signup-disabled,
 *     domain-allowlist, invite-required gates
 *
 * Source-presence guards for upstream merges. The signup route also has
 * behavioural coverage in bizrethink/regression-tests/signup-policy-request.test.ts.
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

// MODIFIED for BizRethink (overlay 074): guard the shared policy wiring.
describe('auth/routes/email-password.ts — overlays 012 + 028 + 048b + 074 guards', () => {
  const source = read('email-password.ts');

  it('imports the signup policy from bizrethink (overlay 074)', () => {
    expect(source).toMatch(/@bizrethink\/customizations\/server-only\/signup-config/);
  });

  it('overlay 074 — shares the policy between the disabled and domain gates', () => {
    expect(source).toMatch(/const signupPolicy = await getSignupPolicy\(\)/);
    expect(source).toMatch(/signupPolicy\.signupDisabled/);
    expect(source).toMatch(/isEmailDomainAllowedForSignup\(email, signupPolicy\)/);
  });

  it('overlay 074 — uses the same policy for the invitation gate', () => {
    expect(source).toMatch(/if \(signupPolicy\.requiresInvite\)/);
  });

  it('overlay 048b — checks for pending OrganisationMemberInvite when gated', () => {
    // The gated path queries organisationMemberInvite to enforce the
    // require-invite-when-domain-gated policy. If this is removed, the
    // B2B security barrier is gone and any allowed-domain email can
    // self-signup — a security regression we want caught immediately.
    expect(source).toMatch(/organisationMemberInvite|findFirst/);
  });
});
