import { ZGetOrganisationAuthenticationPortalResponseSchema } from '@documenso/trpc/server/enterprise-router/get-organisation-authentication-portal.types';
import {
  ZUpdateOrganisationSettingsRequestSchema,
  ZUpdateOrganisationSettingsResponseSchema,
} from '@documenso/trpc/server/organisation-router/update-organisation-settings.types';
import { describe, expect, it } from 'vitest';

/**
 * TRPC schema parity regression suite (added 2026-05-25 after PR #1 deploy fail).
 *
 * PR #1's typecheck errors clustered around two specific failure modes:
 *
 *   1. Upstream extends a TRPC response schema, the matching mutation/query
 *      handler returns the OLD shape → tsc fails. Caught by the build, but
 *      these tests catch it earlier with a clearer error message.
 *
 *   2. Upstream silently drops a field from a TRPC response that our UI
 *      still reads (e.g. allowPersonalOrganisations on the SSO portal
 *      response). Restored by our post-merge fix; this test guards against
 *      future regressions.
 *
 * Pattern: assert that each schema accepts a payload containing every
 * field name our UI / BizRethink code references. Future upstream renames
 * fail noisily here instead of in a Coolify build log.
 *
 * If any test fails after a future upstream sync, do NOT change the schema
 * to make this pass — instead restore the missing field in the
 * corresponding `*.types.ts` file under packages/trpc/server/. See
 * UPSTREAM.md §"Common failure modes" #5.
 */

describe('ZUpdateOrganisationSettingsRequestSchema — overlay 025 hidePoweredBy field', () => {
  it('accepts a payload containing hidePoweredBy=true', () => {
    const result = ZUpdateOrganisationSettingsRequestSchema.safeParse({
      organisationId: 'org_test',
      data: { hidePoweredBy: true },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.hidePoweredBy).toBe(true);
    }
  });

  it('accepts a payload combining hidePoweredBy with upstream branding fields', () => {
    // Regression: post-merge fix added brandingColors + brandingCss alongside
    // overlay 025's hidePoweredBy. All three must coexist on the schema.
    const result = ZUpdateOrganisationSettingsRequestSchema.safeParse({
      organisationId: 'org_test',
      data: {
        hidePoweredBy: false,
        brandingColors: {},
        brandingCss: '/* custom */',
      },
    });

    expect(result.success).toBe(true);
  });
});

describe('ZUpdateOrganisationSettingsResponseSchema — cssWarnings return shape', () => {
  it('accepts a response with cssWarnings present', () => {
    const result = ZUpdateOrganisationSettingsResponseSchema.safeParse({
      cssWarnings: [{ kind: 'value', detail: 'dropped url() reference' }],
    });

    expect(result.success).toBe(true);
  });

  it('accepts a response with cssWarnings omitted (no warnings emitted)', () => {
    const result = ZUpdateOrganisationSettingsResponseSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('ZGetOrganisationAuthenticationPortalResponseSchema — allowPersonalOrganisations restored field', () => {
  it('accepts a response containing allowPersonalOrganisations', () => {
    // This is the post-merge fix: upstream dropped this field but our
    // sso.tsx still reads it. The response schema MUST include it.
    const result = ZGetOrganisationAuthenticationPortalResponseSchema.safeParse({
      defaultOrganisationRole: 'MEMBER',
      enabled: false,
      clientId: 'test-client',
      wellKnownUrl: 'https://idp.example/.well-known/openid-configuration',
      autoProvisionUsers: true,
      allowedDomains: [],
      allowPersonalOrganisations: false,
      clientSecretProvided: false,
    });

    if (!result.success) {
      throw new Error(`Response schema rejected payload: ${JSON.stringify(result.error.issues, null, 2)}`);
    }

    expect(result.data.allowPersonalOrganisations).toBe(false);
  });

  it('allowPersonalOrganisations is REQUIRED — drop = breaking change for sso.tsx', () => {
    const result = ZGetOrganisationAuthenticationPortalResponseSchema.safeParse({
      defaultOrganisationRole: 'MEMBER',
      enabled: false,
      clientId: '',
      wellKnownUrl: '',
      autoProvisionUsers: true,
      allowedDomains: [],
      // intentionally omit allowPersonalOrganisations
      clientSecretProvided: false,
    });

    // If this test starts passing (i.e. the schema now accepts the omission),
    // upstream may have intentionally made the field optional. Decide whether
    // to update our sso.tsx to handle undefined OR keep this assertion.
    expect(result.success).toBe(false);
  });
});
