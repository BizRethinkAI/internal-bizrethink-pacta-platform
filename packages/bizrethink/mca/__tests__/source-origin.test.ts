import { describe, expect, it } from 'vitest';

import { originOf, originOfSource, SECONDARY_PUBLISHERS } from '../provenance/source-origin';
import { readSourceText } from '../provenance/source-text';
import { MCA_DISCLOSURES } from '../registry';

/*
  WHERE THE TEXT CAME FROM, ASKED OF THE FILE RATHER THAN OF A SPEC.

  Georgia is the whole argument for this module. Its spec carried
  `verbatimVerifiedAt` against a browser capture of law.justia.com — a publisher
  that reproduces the Code rather than enacting it — and that capture was also
  incomplete: subsection (a)'s definitions were absent, so "advance fee", the
  term the broker prohibition in (f)(1) turns on, was defined nowhere in what we
  held. The digest over it matched perfectly on every run. It was a faithful
  record of the wrong document, and its card on `/admin/mca` looked exactly like
  California's.

  So this classifies the file, not a field on the spec. A `sourceStrength:
  'official'` property somebody typed would be the same defect one level up:
  a claim with nothing re-executing it. Everything below is re-derived from the
  bytes in `mca/sources/` on every run.

  WHAT IT CANNOT DO, stated first because the register of this package is that a
  check's limits are part of its output: it reads what the file SAYS about its
  own origin. A vendoring header that names an official publisher and is wrong
  is indistinguishable from one that is right. The classification narrows the
  question from "is this text lawful" to "did anyone record where it came
  from", and the second is the one Georgia failed.
*/

describe('a retrieval statement is found, or its absence is reported', () => {
  it('finds a retrieval recorded in the vendoring header', () => {
    const found = originOf(
      [
        'GA MODEL ACT',
        '',
        'published by the State Assembly at',
        'https://www.legis.xx.gov/doc/1',
        'Retrieved 2026-09-07.',
        '',
      ].join('\n'),
    );

    expect(found.origin).toBe('official-publisher');
    expect(found.evidence).toMatch(/legis\.xx\.gov/);
  });

  it('reports a file that says nothing at all about where it came from', () => {
    const found = originOf('Sec. 1. Definitions. As used in this section:\n\n(1) "Provider" means a person.\n');

    expect(found.origin).toBe('origin-not-recorded');
    expect(found.evidence).toBeNull();
    expect(found.why).toMatch(/no.*retriev/i);
  });

  /*
    THE UTAH SHAPE. A header can record where OUR COPY came from — another
    directory of ours — while recording nothing about a publisher. That is a
    copy of a copy, and it must not be scored as the publisher's own.
  */
  it('does not credit a retrieval from one of our own directories', () => {
    const found = originOf(
      [
        'UTAH CODE',
        '',
        'Vendored 2026-09-06 from lombard-contracts',
        'state-disclosures/regulatory-source/UT.layout.txt',
        '',
      ].join('\n'),
    );

    expect(found.origin).toBe('origin-not-recorded');
    expect(found.evidence).toMatch(/lombard-contracts/);
    expect(found.why).toMatch(/publisher/i);
  });

  /*
    LETTERHEAD IS NOT A RETRIEVAL RECORD, AND THIS IS THE JUDGEMENT MOST WORTH
    ARGUING WITH.

    `sources-are-primary.test.ts` accepts an issuing authority's letterhead as
    evidence that a file shows where it came from, and that is a reasonable
    FLOOR — a file with neither a header nor letterhead is anonymous. It is not
    evidence of a publisher, though, because letterhead travels with the text:
    a reproduction of 10 CCR carries "STATE OF CALIFORNIA / DEPARTMENT OF
    FINANCIAL PROTECTION AND INNOVATION" at the top exactly as the Department's
    own PDF does. So does an enacting clause — "Be it enacted by the
    Legislature of the State of Kansas" is in every copy of the bill, including
    a secondary publisher's.

    The Georgia capture almost certainly carried the Code's own headings too.
    Crediting letterhead here would have scored it as officially published on
    the day it was missing subsection (a).
  */
  it('does not treat the issuing authority’s own letterhead as a record of where our copy came from', () => {
    const found = originOf(
      [
        '                    STATE OF CALIFORNIA',
        '     DEPARTMENT OF FINANCIAL PROTECTION AND INNOVATION',
        '',
        'The Department hereby adopts the following new provisions:',
        '',
      ].join('\n'),
    );

    expect(found.origin).toBe('origin-not-recorded');
  });

  it('names a secondary publisher when the retrieval statement names one', () => {
    const found = originOf(
      ['O.C.G.A. § 10-1-393.18', '', 'Retrieved 2026-08-01 from https://law.justia.com/codes/georgia/', ''].join('\n'),
    );

    expect(found.origin).toBe('secondary-publisher');
    expect(found.evidence).toMatch(/justia/);
    expect(found.why).toMatch(/reproduce/i);
  });

  /*
    A HEADER MAY DISCUSS A SECONDARY SOURCE IT REPLACED.

    The Georgia file's own header carries its history — "This REPLACES a browser
    capture of law.justia.com" — and that paragraph is the most valuable prose
    in `sources/`. Classifying the file secondary because the word appears in it
    would delete the record of the defect to satisfy the checker, which is the
    move this package exists to make impossible.
  */
  it('reads only the paragraphs that CLAIM a retrieval, not every mention of a publisher', () => {
    const found = originOf(
      [
        'O.C.G.A. § 10-1-393.18',
        '',
        'PRIMARY TEXT. Senate Bill 90, published by the Georgia General Assembly at',
        'https://www.legis.ga.gov/api/legislation/document/20232024/219440',
        'Retrieved 2026-09-07.',
        '',
        'This REPLACES a browser capture of law.justia.com, which was a secondary',
        'publisher and was incomplete.',
        '',
      ].join('\n'),
    );

    expect(found.origin).toBe('official-publisher');
  });

  /*
    …but a SECOND retrieval claim naming a secondary publisher still counts.
    The check takes the worst claim in the header rather than the first, because
    a file vendored twice records both and the weaker one is the one that
    matters.
  */
  it('takes the weakest retrieval claim in the header, not the first', () => {
    const found = originOf(
      [
        'ACT',
        '',
        'Retrieved 2026-09-07 from https://legis.xx.gov/act.pdf',
        '',
        'Subsections (b)-(k) retrieved from law.justia.com.',
        '',
      ].join('\n'),
    );

    expect(found.origin).toBe('secondary-publisher');
  });

  it('reads the vendoring header only, so a statute that mentions a publisher in its own text is unaffected', () => {
    const body = Array.from({ length: 60 }, (_, i) => `line ${i}`).join('\n');
    const found = originOf(`${body}\n\nRetrieved from law.justia.com\n`);

    expect(found.origin).toBe('origin-not-recorded');
  });

  it('exports the secondary-publisher list so there is one of it in the package', () => {
    expect(SECONDARY_PUBLISHERS.some((p) => p.test('law.justia.com'))).toBe(true);
  });
});

/*
  THE REAL SOURCES.

  These are the assertions that could go red on a re-vendoring, and the reason
  the classification is worth having: the eleven states do NOT all sit at the
  same strength, and until now the page said they did.
*/
describe('the vendored sources, classified as they actually stand', () => {
  const files = [...new Set(MCA_DISCLOSURES.map((d) => d.sourceFile))].sort();

  it('records the retrieval for Georgia and Texas — the two that were re-vendored after a defect', () => {
    expect(originOfSource('GA-SB90-enrolled.txt').origin).toBe('official-publisher');
    expect(originOfSource('TX-Fin-Code-Ch-398.txt').origin).toBe('official-publisher');
  });

  /*
    NINE OF ELEVEN FILES RECORD NO RETRIEVAL, INCLUDING CALIFORNIA'S AND NEW
    YORK'S.

    Both are the promulgating department's own document and both are almost
    certainly the official text — that is a belief, and the file gives a reader
    nothing to re-check it against. Utah's header says so in as many words:
    "ORIGINAL RETRIEVAL SOURCE UNRECORDED".

    Pinned as an exact list rather than a count. A count moves for two reasons —
    a file was re-vendored with a proper header, or a new source arrived without
    one — and they call for opposite responses.
  */
  it('names the files whose origin is not recorded', () => {
    expect(files.filter((f) => originOfSource(f).origin === 'origin-not-recorded')).toEqual([
      'CA-10CCR-900-956.txt',
      'CT-DOB-Guidance.txt',
      'FL-HB-1353.txt',
      'KS-SB-345.txt',
      'LA-Act-198.txt',
      'MO-SB-1359.txt',
      'NY-23NYCRR-600.txt',
      'UT-Title-7-Ch-27.txt',
      'VA-Disclosure-Form.txt',
    ]);
  });

  it('holds no source from a secondary publisher, and the Georgia file’s own history does not make it one', () => {
    expect(files.filter((f) => originOfSource(f).origin === 'secondary-publisher')).toEqual([]);
    expect(originOf(readSourceText('GA-SB90-enrolled.txt')).origin).toBe('official-publisher');
  });

  it('gives every file a reason, so no verdict on the page is a bare word', () => {
    for (const file of files) {
      expect(originOfSource(file).why.length).toBeGreaterThan(0);
    }
  });

  /*
    A file that is not in the image at all is not "unrecorded" by accident —
    there is nothing to read. `/admin/mca` renders this row as SOURCE MISSING
    beside it, and the production image does not carry `mca/sources/` (see
    `source-text.ts`), so this is the classification every card gets in the
    container.
  */
  it('says so plainly when the file is not vendored at all', () => {
    const found = originOfSource('a-file-no-production-image-contains.txt');

    expect(found.origin).toBe('origin-not-recorded');
    expect(found.why).toMatch(/not (in|present)/i);
  });
});
