import { describe, expect, it } from 'vitest';

import { sourceProvenance } from './source-provenance';

/**
 * ADR 0025 §3 wants a monthly job that compares each official source with our
 * stored copy. It cannot, today, because almost nothing about where a copy came
 * from is machine-readable: no file records a URL it could be re-fetched from,
 * and only a quarter record when it was last checked.
 *
 * This reads the block that fixes that. It EXTENDS the existing
 * `Publisher:` / `Site:` convention rather than inventing a second one, for the
 * reason `source-origin.ts` already records at length: a keyword search over
 * prose read a paragraph *about* the absence of a retrieval claim *as* the
 * retrieval claim. A structured block cannot be triggered by discussion of
 * itself.
 */

const header = (lines: string[]) => `${lines.join('\n')}\n\nSome statutory text follows.\n`;

describe('what a vendored source records about itself', () => {
  it('reads the whole block', () => {
    expect(
      sourceProvenance(
        header([
          'Publisher: California Department of Financial Protection and Innovation',
          'Site:      https://dfpi.ca.gov',
          'Retrieved: https://dfpi.ca.gov/wp-content/uploads/2022/06/10-CCR-900-956.pdf',
          'Recorded:  2026-09-08',
          `SourceDigest: ${'a'.repeat(64)}`,
        ]),
      ),
    ).toEqual({
      publisher: 'California Department of Financial Protection and Innovation',
      site: 'https://dfpi.ca.gov',
      retrievedFrom: 'https://dfpi.ca.gov/wp-content/uploads/2022/06/10-CCR-900-956.pdf',
      recordedOn: '2026-09-08',
      sourceDigest: 'a'.repeat(64),
    });
  });

  /**
   * THE FILES AS THEY STAND TODAY. Thirteen carry a publisher and a site, five
   * carry a date, none carries a retrieval URL — so every field has to be
   * independently absent without taking the others down with it.
   */
  it('reads a partial block without inventing the rest', () => {
    expect(sourceProvenance(header(['Publisher: Kansas Legislature', 'Site:      https://kslegislature.gov']))).toEqual(
      {
        publisher: 'Kansas Legislature',
        site: 'https://kslegislature.gov',
        retrievedFrom: null,
        recordedOn: null,
        sourceDigest: null,
      },
    );
  });

  it('records nothing for a file with no block at all', () => {
    expect(sourceProvenance('An enrolled act, with no header of any kind.\n')).toEqual({
      publisher: null,
      site: null,
      retrievedFrom: null,
      recordedOn: null,
      sourceDigest: null,
    });
  });

  /**
   * The trap `source-origin.ts` fell into, asserted here so this parser cannot
   * fall into it too: several headers EXPLAIN, in prose, why they cannot say
   * where the file was retrieved from. That explanation must not be read as a
   * retrieval.
   */
  it('is not fooled by prose discussing retrieval', () => {
    const explaining = header([
      'Publisher: Connecticut Department of Banking',
      'Site:      https://portal.ct.gov/dob',
      '',
      'WHY THIS HEADER SAYS "PUBLISHER" AND NOT "RETRIEVED FROM". The deep link',
      'this file was retrieved through was not written down and is not',
      'recoverable. Retrieved: nothing useful survives.',
    ]);

    /*
      Note WHICH guard catches this: the prose line does match the block shape,
      so the parser reads "nothing useful survives." and then the URL check
      rejects it. That is the honest mechanism — a header cannot be
      distinguished from a sentence by shape alone, which is exactly why the
      value has to be validated rather than trusted.
    */
    expect(sourceProvenance(explaining).retrievedFrom).toBe(null);
  });

  /**
   * A URL is the thing that decides whether the monthly job can check this
   * source by itself, so a value that is not one is worse than none: it would
   * put the file in the automatic column and fail there every month.
   */
  it.each([
    'not-a-url',
    'ftp://example.invalid/x',
    'see the attached email',
  ])('refuses a retrieval that is not an http(s) URL: %s', (value) => {
    expect(sourceProvenance(header([`Retrieved: ${value}`])).retrievedFrom).toBe(null);
  });

  it.each(['08/09/2026', 'September 2026', 'soon'])('refuses a date that is not ISO: %s', (value) => {
    expect(sourceProvenance(header([`Recorded: ${value}`])).recordedOn).toBe(null);
  });

  /**
   * Only the header. A statute quoting the word "Recorded:" in its own body —
   * recording fees, recorded instruments, a UCC filing — must not become this
   * file's provenance.
   */
  it('reads only the header, not the statute below it', () => {
    const body = [
      'Publisher: Florida Office of Financial Regulation',
      '',
      ...Array.from({ length: 60 }, (_, line) => `Text line ${line}.`),
      'Retrieved: https://example.invalid/not-the-header.pdf',
      'Recorded:  1999-01-01',
    ].join('\n');

    const provenance = sourceProvenance(body);

    expect(provenance.publisher).toBe('Florida Office of Financial Regulation');
    expect(provenance.retrievedFrom).toBe(null);
    expect(provenance.recordedOn).toBe(null);
  });

  /**
   * A baseline that is not a sha256 is not a baseline. Accepting one would put
   * the source in the automatic column and report it as changed forever.
   */
  it.each(['nope', 'a'.repeat(63), `${'z'.repeat(64)}`])('refuses a digest that is not a sha256: %s', (value) => {
    expect(sourceProvenance(header([`SourceDigest: ${value}`])).sourceDigest).toBe(null);
  });
});
