import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The answer set is hashed in two moments: when a link is ISSUED, and every
 * time the reviewer's page asks whether the lease has moved since. Those two
 * must hash the same fields or the comparison is meaningless.
 *
 * They drifted. `documents` was added to the comparison when the receipt
 * addendum landed and never to the issue side, so every link was born stale:
 * mint a token, open it, and the reviewer is told "the lease has changed since
 * this link was sent" before anyone has touched anything.
 *
 * The bug was possible because the field list existed twice, written out by
 * hand in both places. So the fix is not to add `documents` to the second copy
 * — it is that there is no second copy. This asserts that.
 */

const router = readFileSync(new URL('../../server-only/trpc/lease-builder-router.ts', import.meta.url), 'utf8');

describe('the answers hash', () => {
  it('is built in exactly one place', () => {
    const callSites = router.match(/hashAnswers\(/g) ?? [];

    expect(
      callSites.length,
      'hashAnswers is called more than once, so the issue-time and comparison-time field lists can disagree again — the exact way every new review link came out already stale',
    ).toBe(1);
  });

  it('is what the issue path stores', () => {
    /*
      Pinned by name rather than by counting: `create` must go through the
      shared function, not assemble its own object literal.
    */
    expect(router).toMatch(/const answersHash = currentAnswersHash\(matter\);/);
  });
});
