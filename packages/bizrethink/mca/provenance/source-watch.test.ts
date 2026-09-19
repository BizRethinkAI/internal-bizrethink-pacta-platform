import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { MANUAL_CHECK_DUE_AFTER_DAYS, watchedSource, watchedSources } from './source-watch';

/**
 * ADR 0025 §3. The job splits the stored sources into the ones it can check by
 * itself and the ones that need a person, and is honest about which is which —
 * a check that claims to verify twenty sources and actually verifies none is
 * worse than one that says so.
 */

const now = new Date('2026-09-18T00:00:00Z');
/** Most tests state provenance in the file itself; the sidecar is exercised separately. */
const sidecar = {};
const header = (lines: string[]) => `${lines.join('\n')}\n\nStatutory text.\n`;

describe('which sources the job can check by itself', () => {
  it('treats a URL with a confirmed baseline as automatic', () => {
    const entry = watchedSource(
      'CA-10CCR-900-956.txt',
      header([
        'Publisher: DFPI',
        'Site: https://dfpi.ca.gov',
        'Retrieved: https://dfpi.ca.gov/x.pdf',
        `SourceDigest: ${'a'.repeat(64)}`,
      ]),
      sidecar,
      now,
    );

    expect(entry).toMatchObject({ kind: 'automatic' });
    expect(entry.kind === 'automatic' && entry.pages).toEqual([
      { url: 'https://dfpi.ca.gov/x.pdf', digest: 'a'.repeat(64) },
    ]);
  });

  /**
   * A URL alone is not enough. The baseline is a person saying "I read this
   * page and it is the statute we stored"; without one there is nothing to
   * compare a fetch against, so the source still needs a person.
   */
  it('leaves a URL with no baseline in the manual column', () => {
    const entry = watchedSource(
      'CA-10CCR-900-956.txt',
      header(['Publisher: DFPI', 'Retrieved: https://dfpi.ca.gov/x.pdf']),
      sidecar,
      now,
    );

    expect(entry).toMatchObject({ kind: 'manual', overdue: true });
  });

  it('treats a source with no URL as manual, and says where to look', () => {
    const entry = watchedSource(
      'KS-SB-345.txt',
      header(['Publisher: Kansas Legislature', 'Site: https://kslegislature.gov', 'Recorded: 2026-09-08']),
      sidecar,
      now,
    );

    expect(entry).toMatchObject({
      kind: 'manual',
      publisher: 'Kansas Legislature',
      site: 'https://kslegislature.gov',
      daysSinceRecorded: 10,
      overdue: false,
    });
  });

  it('calls a manual source overdue once it passes the threshold', () => {
    const entry = watchedSource('old.txt', header(['Publisher: X', 'Recorded: 2026-01-01']), {}, now);

    expect(entry.kind).toBe('manual');
    expect(entry).toMatchObject({ overdue: true });
    expect(entry.kind === 'manual' && entry.daysSinceRecorded).toBeGreaterThanOrEqual(MANUAL_CHECK_DUE_AFTER_DAYS);
  });

  /**
   * NEVER CHECKED IS NOT THE SAME AS RECENTLY CHECKED, and reporting it as fine
   * would be the check congratulating itself on its own blind spot. Fifteen of
   * the twenty stored sources are in exactly this state today.
   */
  it('counts a source nobody has ever confirmed as overdue', () => {
    expect(watchedSource('unknown.txt', header(['Publisher: X']), {}, now)).toMatchObject({
      kind: 'manual',
      recordedOn: null,
      daysSinceRecorded: null,
      overdue: true,
    });
  });

  it('orders the report so two runs can be compared', () => {
    const report = watchedSources(
      [
        { file: 'b.txt', text: header(['Publisher: B']) },
        { file: 'a.txt', text: header(['Publisher: A']) },
      ],
      {},
      now,
    );

    expect(report.map((entry) => entry.file)).toEqual(['a.txt', 'b.txt']);
  });
});

/**
 * The report is about the files that actually exist, so it reads them. This is
 * the assertion that would notice a source being added with no provenance at
 * all — the failure that put us here.
 */
describe('the sources as they actually stand', () => {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../sources');
  const files = readdirSync(dir)
    .filter((file) => file !== 'README.md' && file !== 'provenance.json')
    .map((file) => ({ file, text: readFileSync(join(dir, file), 'latin1') }));

  /** The sidecar that actually ships, so this asserts the real state. */
  const shipped = JSON.parse(readFileSync(join(dir, 'provenance.json'), 'utf8')) as Record<string, never>;

  it('reads every stored source', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(watchedSources(files, shipped, now)).toHaveLength(files.length);
  });

  /**
   * THE GAP, NAMED RATHER THAN TOLERATED OR PRETENDED AWAY.
   *
   * Every stored source should say who published it, because that is what a
   * person needs in order to go and look. One does not, and I would not invent
   * one: `VA-Code-6.2-2228-2238.txt` records nothing about its own origin, and
   * a made-up publisher on a statute file is worse than an admitted gap.
   *
   * Pinned as an exact list rather than a count, so it can only shrink
   * deliberately — and so a NEW source added without provenance fails here
   * rather than joining a tolerated backlog.
   */
  /**
   * NOT ONLY THE TEXT ONES. `VA-Disclosure-Form.pdf` is a prescribed form and
   * needs watching as much as any statute. An earlier version of this filtered
   * on `.txt` and skipped it without saying so — a check with a silent blind
   * spot, which is the failure ADR 0025 §3 exists to prevent.
   */
  it('watches the prescribed form as well as the statutes', () => {
    const watched = watchedSources(files, shipped, now).map((entry) => entry.file);

    expect(watched).toContain('VA-Disclosure-Form.pdf');
  });

  it('has exactly one source whose publisher nobody has recorded', () => {
    const anonymous = watchedSources(files, shipped, now)
      .filter((entry) => entry.publisher === null)
      .map((entry) => entry.file);

    expect(anonymous).toEqual(['VA-Code-6.2-2228-2238.txt']);
  });

  /**
   * And it cannot hide: a source nobody can check is reported as needing one,
   * which is the whole point of splitting the columns honestly.
   */
  it('reports the unrecorded source as manual and overdue', () => {
    const virginia = watchedSources(files, shipped, now).find((entry) => entry.file === 'VA-Code-6.2-2228-2238.txt');

    expect(virginia).toMatchObject({ kind: 'manual', recordedOn: null, overdue: true });
  });
});

/**
 * SOURCES THAT ARE NOT ONE PAGE.
 *
 * `retrievedFrom` was a single URL, and the stored sources are not. Counting
 * the deep links in their own headers: `FL-Stat-559.961-9615.txt` consolidates
 * SIX statute sections, and `CT-CGS-36a-861-872.txt`, `UT-Title-7-Ch-27.txt`
 * and both Virginia form extractions cite two each. Only seven of nineteen are
 * cleanly one page. Connecticut's README says it outright: "the combined file
 * is our consolidation, not a document fetched from a single official URL."
 *
 * A consolidation is watched by watching its parts. Any part moving is the
 * source moving, because any part is the law.
 */
describe('sources consolidated from more than one page', () => {
  const site = (urls: { url: string; digest: string | null }[]) => ({ pages: urls });

  it('is automatic once every page has a confirmed baseline', () => {
    const entry = watchedSource(
      'FL-Stat.txt',
      header(['Publisher: Florida Senate']),
      {
        'FL-Stat.txt': site([
          { url: 'https://flsenate.gov/559.961', digest: 'a'.repeat(64) },
          { url: 'https://flsenate.gov/559.9611', digest: 'b'.repeat(64) },
        ]),
      },
      now,
    );

    expect(entry).toMatchObject({ kind: 'automatic' });
    expect(entry.kind === 'automatic' && entry.pages).toEqual([
      { url: 'https://flsenate.gov/559.961', digest: 'a'.repeat(64) },
      { url: 'https://flsenate.gov/559.9611', digest: 'b'.repeat(64) },
    ]);
  });

  /*
    PARTIALLY BASELINED IS NOT BASELINED. Checking the five sections someone got
    to and silently ignoring the sixth would report `unchanged` for a statute
    with an unwatched part — the check blessing its own blind spot, which is the
    failure the baseline rule exists to prevent.
  */
  it('stays manual while any one page is unconfirmed', () => {
    const entry = watchedSource(
      'FL-Stat.txt',
      header(['Publisher: Florida Senate']),
      {
        'FL-Stat.txt': site([
          { url: 'https://flsenate.gov/559.961', digest: 'a'.repeat(64) },
          { url: 'https://flsenate.gov/559.9611', digest: null },
        ]),
      },
      now,
    );

    expect(entry).toMatchObject({ kind: 'manual', overdue: true });
  });

  it('stays manual when the page list is empty', () => {
    const entry = watchedSource('x.txt', header(['Publisher: X']), { 'x.txt': site([]) }, now);

    expect(entry).toMatchObject({ kind: 'manual' });
  });

  /*
    The single-URL form still works and is what a file's own `Retrieved:` and
    `SourceDigest:` header produces. One page is a list of one.
  */
  it('reads a single-page source as a list of one', () => {
    const entry = watchedSource(
      'TX.txt',
      header(['Publisher: TLO', 'Retrieved: https://capitol.texas.gov/x.htm', `SourceDigest: ${'c'.repeat(64)}`]),
      {},
      now,
    );

    expect(entry.kind === 'automatic' && entry.pages).toEqual([
      { url: 'https://capitol.texas.gov/x.htm', digest: 'c'.repeat(64) },
    ]);
  });

  it('prefers the file’s own header over the sidecar, as it always did', () => {
    const entry = watchedSource(
      'TX.txt',
      header(['Publisher: TLO', 'Retrieved: https://capitol.texas.gov/in-file.htm', `SourceDigest: ${'c'.repeat(64)}`]),
      { 'TX.txt': site([{ url: 'https://example.invalid/sidecar.htm', digest: 'd'.repeat(64) }]) },
      now,
    );

    expect(entry.kind === 'automatic' && entry.pages.map((page) => page.url)).toEqual([
      'https://capitol.texas.gov/in-file.htm',
    ]);
  });
});
