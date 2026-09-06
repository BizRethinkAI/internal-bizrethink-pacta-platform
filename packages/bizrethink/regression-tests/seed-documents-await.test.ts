import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `seedDocuments()` must actually await the documents it seeds.
 *
 * THIS IS THE find-documents FLAKE. For months the `Find Documents API - Team
 * Context` block failed roughly one CI run in five, and the recorded root cause
 * — DB contention on the shared document counter — was wrong. So were three
 * later theories, including a silent role downgrade that got as far as being
 * written into FORK-TESTING.md before it was disproven.
 *
 * The actual defect is four characters of missing syntax. `seedDocuments` maps
 * over the documents and builds a `match()` chain that is never TERMINATED:
 *
 *     match(document.type)
 *       .with(DocumentStatus.DRAFT,     async () => seedDraftDocument(...))
 *       .with(DocumentStatus.PENDING,   async () => seedPendingDocument(...))
 *       .with(DocumentStatus.COMPLETED, async () => seedCompletedDocument(...)),
 *       // no .exhaustive() / .otherwise() / .run()
 *
 * ts-pattern evaluates the matching handler eagerly, so the writes DO start —
 * but the chain returns a `Match` object, not a Promise. `Promise.all` awaits
 * nothing. The seed is fire-and-forget, and the test queries the API while rows
 * are still landing.
 *
 * The tell was in the data the whole time. Twenty repeats of one test produced
 * `Received:` values of 0, 1, 2, 3, 4 and 5 — a continuous distribution. No
 * filter, role or visibility rule can produce that; only a partial write can.
 *
 * WHY IT IS INTERMITTENT, and why an IDLE machine fails MORE: it is a race
 * between the unawaited seeds (last row lands ~19-38ms) and the gap before the
 * test's query (createApiToken + one HTTP round trip, ~6-12ms). A fast, idle
 * box shrinks the gap below the seed time and goes red. This is why a freshly
 * reset database made it fail MORE often, not less — smaller database, faster
 * queries, smaller gap.
 *
 * A/B on the same box, same DB, back to back:
 *
 *     unpatched   20 failed /   0 passed        9 failed /  91 passed
 *     patched      0 failed /  20 passed        0 failed / 100 passed
 *
 * `seedDocuments` has 49 call sites across 5 spec files. Every one of them is
 * racy without the terminal call; the ones that pass have a wide enough gap.
 *
 * Upstream file, so the fix ships as overlay 068. This test exists because a
 * future upstream merge could silently drop the terminator and hand back a
 * flake that has already cost several days and produced four wrong root causes.
 */

const SEED = join(__dirname, '../../prisma/seed/documents.ts');

/** The body of `export const seedDocuments`, up to the next top-level export. */
const seedDocumentsBody = (): string => {
  const source = readFileSync(SEED, 'utf8');
  const start = source.indexOf('export const seedDocuments');

  expect(start, `seedDocuments no longer exists in ${SEED} — upstream renamed or moved it`).toBeGreaterThan(-1);

  const rest = source.slice(start + 'export const seedDocuments'.length);
  const end = rest.indexOf('\nexport const ');

  return end === -1 ? rest : rest.slice(0, end);
};

describe('seedDocuments awaits the documents it seeds', () => {
  /*
    The whole bug, in one assertion. A match() chain without a terminal call
    returns a Match object rather than a Promise, so the surrounding
    Promise.all resolves before a single row exists.
  */
  it('terminates its match() chain, so the returned value is a real Promise', () => {
    const body = seedDocumentsBody();

    expect(body).toContain('match(document.type)');

    const terminated = /\.(exhaustive|run)\(\)|\.otherwise\(/.test(body);

    expect(
      terminated,
      'seedDocuments builds a match() chain with no .exhaustive() / .otherwise() / .run(). ' +
        'ts-pattern returns a Match object, not a Promise, so Promise.all awaits nothing and ' +
        'the seed becomes fire-and-forget. This is the find-documents flake — see overlay 068.',
    ).toBe(true);
  });

  /*
    The eslint-disable was the linter correctly reporting that the async arrow
    never awaits. Silencing it is what let the bug survive review. If it comes
    back, the terminator has probably gone with it.
  */
  it('does not silence require-await over the seeding map', () => {
    const body = seedDocumentsBody();

    expect(
      body.includes('eslint-disable-next-line @typescript-eslint/require-await'),
      'the require-await suppression is back over the seeding map. That rule firing is the ' +
        'symptom of the unawaited match() chain, not noise to silence.',
    ).toBe(false);
  });
});
