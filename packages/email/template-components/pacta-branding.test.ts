import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Pacta-branding regression guards for the 3 email template-components
 * that conflict during the upstream merge. Source-presence guards (no
 * React rendering needed) — if the merge silently reverts these to
 * Documenso defaults, the assertions fail loudly.
 *
 * E8 (Playwright forgot-password test) covers template-footer.tsx at the
 * rendered-HTML level via Inbucket; these unit-level guards add fast-
 * feedback regression coverage for the other two templates that aren't
 * exercised by the password-reset path.
 */

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf-8');

describe('template-confirmation-email — Pacta branding regression guard', () => {
  const source = read('template-confirmation-email.tsx');

  it('still says "Welcome to Pacta!" (not Documenso)', () => {
    expect(source).toMatch(/Welcome to Pacta/);
    expect(source).not.toMatch(/Welcome to Documenso/);
  });
});

describe('template-document-image — Pacta branding regression guard', () => {
  const source = read('template-document-image.tsx');

  it('alt text is "Pacta" (not "Documenso")', () => {
    expect(source).toMatch(/alt=['"]Pacta['"]/);
    expect(source).not.toMatch(/alt=['"]Documenso['"]/);
  });
});

describe('template-footer — overlay 023 regression guard', () => {
  const source = read('template-footer.tsx');

  it('source contains the overlay 023 marker comment', () => {
    expect(source).toMatch(/overlay 023/);
  });

  it('does not contain the Documenso San Francisco fallback address in JSX', () => {
    // Strip comments first — the file's overlay 023 header comment
    // explains what was changed (and mentions the old address). We only
    // want to assert the actual rendered JSX doesn't contain the
    // Documenso default.
    const sourceWithoutComments = source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(sourceWithoutComments).not.toContain('2261 Market Street');
  });

  it('references BizRethink or Pacta brand wording', () => {
    expect(source).toMatch(/BizRethink|Pacta/i);
  });
});
