import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Overlay 009 regression guard: BizRethink replaced AWS SES email-domain
 * verification with a local DNS TXT lookup. Per MERGE-MANIFEST §3, this
 * is a fundamental design fork from upstream and a top candidate for
 * silent revert during merge (upstream may re-introduce SES at any time).
 *
 * Source-presence guard catches "merge reverted to SES" failure mode.
 * Full DNS-mocked behavior test deferred — would require mocking the
 * built-in node:dns module which is more setup than this guard is worth.
 */
const SOURCE = readFileSync(
  join(__dirname, 'verify-email-domain.ts'),
  'utf-8',
);

describe('verify-email-domain — overlay 009 DNS-not-SES regression guard', () => {
  it('source contains the overlay 009 BizRethink marker', () => {
    expect(SOURCE).toMatch(/BizRethink/);
    expect(SOURCE).toMatch(/DNS|resolveTxt|dns\.promises/i);
  });

  it('source does NOT use AWS SES verification (no GetEmailIdentityCommand)', () => {
    // Strip comments before asserting on code (the rationale comment
    // mentions "AWS SES" historically).
    const stripped = SOURCE.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toContain('GetEmailIdentityCommand');
    expect(stripped).not.toContain('@aws-sdk/client-sesv2');
  });

  it('uses public DNS resolvers (Cloudflare 1.1.1.1 / Google 8.8.8.8) per overlay rationale', () => {
    expect(SOURCE).toMatch(/1\.1\.1\.1|8\.8\.8\.8/);
  });
});
