import { describe, expect, it } from 'vitest';

import { checkSources } from './source-check';
import { normalisedDigest } from './source-text';

/**
 * ADR 0025 §3's four requirements, one test each where they are testable:
 *
 *   1. compare the OFFICIAL SOURCE with the vendored copy, not the copy with
 *      itself — which is all the existing provenance checkers can do;
 *   2. report a difference rather than resolve one;
 *   3. fail loudly when a source cannot be fetched;
 *   4. say, per source, when it was last successfully compared.
 */

const now = new Date('2026-09-18T00:00:00Z');

/**
 * A source a person has confirmed: a URL AND the digest the published page had
 * when they read it. The baseline is what the monthly fetch is compared
 * against — never our own copy, which is extracted text with a header we wrote
 * and could not match an HTML page on any run.
 */
const automatic = (pageWhenConfirmed: string) =>
  `Publisher: Texas Legislature Online\nSite: https://capitol.texas.gov\nRetrieved: https://capitol.texas.gov/x.htm\nRecorded: 2026-09-05\nSourceDigest: ${normalisedDigest(pageWhenConfirmed)}\n\nOur extracted copy of the statute.`;

const manual = (recorded: string | null) =>
  `Publisher: Kansas Legislature\nSite: https://kslegislature.gov\n${recorded ? `Recorded: ${recorded}\n` : ''}\nText.`;

describe('comparing the stored copy with the source it came from', () => {
  it('reports a source whose page has not moved', async () => {
    const page = '<html>The statute, unchanged.</html>';
    const report = await checkSources([{ file: 'tx.txt', text: automatic(page) }], {}, async () => page, now);

    expect(report.results[0]).toMatchObject({ file: 'tx.txt', state: 'unchanged' });
    expect(report.needsAttention).toBe(false);
  });

  /**
   * The requirement the existing checkers cannot meet. They verify our copy
   * against itself, which catches our drift from the copy and never the copy's
   * drift from the law.
   */
  it('reports a source whose published page has moved', async () => {
    const report = await checkSources(
      [{ file: 'tx.txt', text: automatic('<html>The statute as confirmed.</html>') }],
      {},
      async () => '<html>The statute, amended in 2026.</html>',
      now,
    );

    expect(report.results[0]).toMatchObject({ state: 'differs' });
    expect(report.needsAttention).toBe(true);
  });

  /**
   * REPORTS, NEVER RESOLVES. A statute that moved is a reading task, so the
   * report says to read it and does not hand over the new text as if it were a
   * merge candidate.
   */
  it('tells a person to read the difference rather than offering to apply it', async () => {
    const report = await checkSources(
      [{ file: 'tx.txt', text: automatic('<html>old</html>') }],
      {},
      async () => '<html>amended</html>',
      now,
    );
    const first = report.results[0];

    expect(first.state === 'differs' && first.why).toMatch(/do not merge/i);
    expect(JSON.stringify(report)).not.toContain('amended');
  });

  /**
   * A publisher reflowing its template is not the law changing, and reporting
   * it as such every month teaches everyone to ignore the report.
   */
  it('does not report a difference for reflowed whitespace', async () => {
    const report = await checkSources(
      [{ file: 'tx.txt', text: automatic('A sentence of statute.') }],
      {},
      async () => 'A   sentence   of\n\n  statute.',
      now,
    );

    expect(report.results[0]).toMatchObject({ state: 'unchanged' });
  });

  /**
   * "A check that silently stops running is worse than no check." A legislature
   * reorganising its site is the event this job exists for, and it is also how
   * the links rotted last time.
   */
  it('fails loudly when a source cannot be fetched', async () => {
    const report = await checkSources(
      [{ file: 'tx.txt', text: automatic('<html>text</html>') }],
      {},
      async () => {
        throw new Error('404 Not Found');
      },
      now,
    );

    expect(report.results[0]).toMatchObject({ state: 'unreachable' });
    // Names the page, not just the error: a consolidated source has several.
    expect(report.results[0].state === 'unreachable' && report.results[0].why).toContain('404 Not Found');
    expect(report.needsAttention).toBe(true);
  });
});

describe('the sources nobody can check automatically', () => {
  it('says when one was last confirmed, and by whom it is published', async () => {
    const report = await checkSources([{ file: 'ks.txt', text: manual('2026-09-08') }], {}, async () => '', now);

    expect(report.results[0]).toMatchObject({
      state: 'manual',
      publisher: 'Kansas Legislature',
      site: 'https://kslegislature.gov',
      overdue: false,
    });
    expect(report.results[0].state === 'manual' && report.results[0].why).toContain('2026-09-08');
  });

  it('does not fetch them', async () => {
    let fetched = 0;

    await checkSources(
      [{ file: 'ks.txt', text: manual('2026-09-08') }],
      {},
      async () => {
        fetched += 1;

        return '';
      },
      now,
    );

    expect(fetched).toBe(0);
  });

  it('raises one that has gone too long unconfirmed', async () => {
    const report = await checkSources([{ file: 'ks.txt', text: manual('2026-01-01') }], {}, async () => '', now);

    expect(report.results[0]).toMatchObject({ state: 'manual', overdue: true });
    expect(report.needsAttention).toBe(true);
  });

  it('raises one nobody has ever confirmed', async () => {
    const report = await checkSources([{ file: 'ks.txt', text: manual(null) }], {}, async () => '', now);

    expect(report.results[0].state === 'manual' && report.results[0].why).toMatch(/never recorded/i);
    expect(report.needsAttention).toBe(true);
  });

  /**
   * A recently confirmed manual source is not a problem. If it were, every run
   * would need attention and the report would stop being read — which is the
   * same failure as not running at all.
   */
  it('leaves a recently confirmed one alone', async () => {
    const report = await checkSources([{ file: 'ks.txt', text: manual('2026-09-08') }], {}, async () => '', now);

    expect(report.needsAttention).toBe(false);
  });

  /**
   * A URL WITHOUT A BASELINE IS NOT AUTOMATIC. Recording the baseline asserts
   * "I read this page and it is the statute we stored" — a machine taking it on
   * first run would silently bless a change nobody had seen.
   */
  it('will not check a URL nobody has confirmed a baseline for', async () => {
    const noBaseline =
      'Publisher: TX\nSite: https://capitol.texas.gov\nRetrieved: https://capitol.texas.gov/x.htm\n\nCopy.';
    let fetched = 0;

    const report = await checkSources(
      [{ file: 'tx.txt', text: noBaseline }],
      {},
      async () => {
        fetched += 1;

        return '';
      },
      now,
    );

    expect(fetched).toBe(0);
    expect(report.results[0]).toMatchObject({ state: 'manual', overdue: true });
  });
});

/**
 * A consolidated source is watched by watching its parts.
 *
 * `FL-Stat-559.961-9615.txt` is six statute sections in one file; Connecticut
 * is a base chapter plus a 2026 supplement. Any part is the law, so any part
 * moving is the source moving.
 */
const consolidated = (pages: { url: string; digest: string | null }[]) => ({ 'fl.txt': { pages } });

describe('a source assembled from several pages', () => {
  const page = (body: string) => body;

  it('reports unchanged only when every page is unchanged', async () => {
    const report = await checkSources(
      [{ file: 'fl.txt', text: 'Publisher: Florida Senate\n\nOur copy.' }],
      consolidated([
        { url: 'https://fl/559.961', digest: normalisedDigest('one') },
        { url: 'https://fl/559.9611', digest: normalisedDigest('two') },
      ]),
      async (url) => page(url.endsWith('559.961') ? 'one' : 'two'),
      now,
    );

    expect(report.results[0]).toMatchObject({ state: 'unchanged' });
    expect(report.needsAttention).toBe(false);
  });

  /*
    THE CASE A SINGLE URL COULD NOT SEE. Five sections unchanged and the sixth
    amended is still an amended statute, and the old model would have watched
    whichever one page happened to be recorded.
  */
  it('reports the source as differing when any one page has moved', async () => {
    const report = await checkSources(
      [{ file: 'fl.txt', text: 'Publisher: Florida Senate\n\nOur copy.' }],
      consolidated([
        { url: 'https://fl/559.961', digest: normalisedDigest('one') },
        { url: 'https://fl/559.9611', digest: normalisedDigest('two') },
      ]),
      async (url) => page(url.endsWith('559.961') ? 'one' : 'two, amended'),
      now,
    );

    expect(report.results[0]).toMatchObject({ state: 'differs' });
    expect(report.results[0].state === 'differs' && report.results[0].why).toContain('559.9611');
    expect(report.needsAttention).toBe(true);
  });

  it('names the page it could not reach rather than the source as a whole', async () => {
    const report = await checkSources(
      [{ file: 'fl.txt', text: 'Publisher: Florida Senate\n\nOur copy.' }],
      consolidated([
        { url: 'https://fl/559.961', digest: normalisedDigest('one') },
        { url: 'https://fl/559.9611', digest: normalisedDigest('two') },
      ]),
      async (url) => {
        if (url.endsWith('559.9611')) {
          throw new Error('404 Not Found');
        }

        return 'one';
      },
      now,
    );

    expect(report.results[0]).toMatchObject({ state: 'unreachable' });
    expect(report.results[0].state === 'unreachable' && report.results[0].why).toContain('559.9611');
  });

  /*
    An unreachable page outranks a difference on another. "We could not look"
    is a weaker claim than "it changed", and reporting the stronger one from a
    partial read would overstate what the run actually established.
  */
  it('reports a page it could not reach even when another page differs', async () => {
    const report = await checkSources(
      [{ file: 'fl.txt', text: 'Publisher: Florida Senate\n\nOur copy.' }],
      consolidated([
        { url: 'https://fl/a', digest: normalisedDigest('a') },
        { url: 'https://fl/b', digest: normalisedDigest('b') },
      ]),
      async (url) => {
        if (url.endsWith('/b')) {
          throw new Error('503');
        }

        return 'a, amended';
      },
      now,
    );

    expect(report.results[0]).toMatchObject({ state: 'unreachable' });
  });

  it('still never hands back the text it fetched', async () => {
    const report = await checkSources(
      [{ file: 'fl.txt', text: 'Publisher: Florida Senate\n\nOur copy.' }],
      consolidated([{ url: 'https://fl/a', digest: normalisedDigest('a') }]),
      async () => 'a, amended in 2026',
      now,
    );

    expect(JSON.stringify(report)).not.toContain('amended in 2026');
  });
});
