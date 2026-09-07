import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { MCA_DISCLOSURES } from '../registry';

/**
 * A digest proves the bytes have not moved. It does not prove they were the
 * right bytes.
 *
 * Georgia carried `verbatimVerifiedAt` against a browser capture of
 * law.justia.com — a secondary publisher — that was also incomplete:
 * subsection (a)'s definitions and the full text of (b)-(k) were absent, so
 * "advance fee", the term the broker prohibition in (f)(1) turns on, was
 * defined nowhere in what we held. The digest over it was perfectly faithful.
 * It was a faithful record of the wrong document.
 *
 * The file said so in its own header, and nothing read the header. That is the
 * gap: every other check in this package asks whether the text still matches,
 * and none asked where it came from.
 *
 * Found on 2026-09-07 by a refutation pass over a review of something else
 * entirely, which is not a repeatable way to find it.
 */
const sourcesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../sources');

/** Publishers that reproduce a statute rather than enact or codify it. */
const SECONDARY = [/justia/i, /casetext/i, /findlaw/i, /lawserver/i, /codes\.findlaw/i];

describe('every vendored source is primary text', () => {
  const files = [...new Set(MCA_DISCLOSURES.map((d) => d.sourceFile))];

  it('covers every disclosure', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s does not name a secondary publisher as its origin', (file) => {
    // The first 40 lines are the vendoring header, where provenance is
    // recorded. Matching the whole file would flag a statute that happens to
    // mention a publisher in its own text.
    const header = readFileSync(resolve(sourcesDir, file), 'utf8').split('\n').slice(0, 40).join('\n');

    // A header may DISCUSS a secondary source it replaced — that is the
    // Georgia file's own history and worth keeping. What it may not do is
    // claim one as where this text came from.
    const origin = header.match(/Retrieved[^\n]*(?:\n(?!\n)[^\n]*)*/i)?.[0] ?? '';

    for (const pattern of SECONDARY) {
      expect(origin).not.toMatch(pattern);
    }
  });

  /**
   * Provenance shows up two ways here, and both are legitimate.
   *
   * A vendoring header states where the file was retrieved from. Or the
   * document carries the issuing authority's own letterhead — CA-10CCR opens
   * with "STATE OF CALIFORNIA / DEPARTMENT OF FINANCIAL PROTECTION AND
   * INNOVATION", which is stronger evidence of primary text than any line we
   * could write about it.
   *
   * What must not happen is neither.
   */
  it.each(files)('%s shows where it came from', (file) => {
    const header = readFileSync(resolve(sourcesDir, file), 'utf8').split('\n').slice(0, 40).join('\n');

    const retrieved = /Retrieved|Vendored|Source:|published by|https?:\/\//i.test(header);
    const letterhead = /STATE OF |DEPARTMENT OF |GENERAL ASSEMBLY|LEGISLATURE|COMMISSIONER|OFFICE OF |CODE OF /i.test(
      header,
    );

    expect(retrieved || letterhead).toBe(true);
  });
});
