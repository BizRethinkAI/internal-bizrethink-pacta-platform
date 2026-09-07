import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CA_ITEMIZATION } from '../prescribed/forms/ca-itemization';
import { CA_OFFER_SUMMARY } from '../prescribed/forms/ca-offer-summary';
import { NY_ITEMIZATION } from '../prescribed/forms/ny-itemization';
import { checkItemization, checkItemizationAgainstSource, itemizationCoverage } from '../prescribed/itemization';
import { sectionOf } from '../provenance/source-text';
import caRendered from './ca-itemization.fixture.json';
import nyRendered from './ny-itemization.fixture.json';

/*
  Lombard's shipped Itemizations of Amount Financed, against 10 CCR §956 and
  23 NYCRR §600.17.

  Both fixtures come from the DOCX we publish. Neither can be produced by
  `lombard-contracts/pipeline/extract_disclosure_rows.py`: that script finds the
  disclosure table by looking for "Funding Provided" or "Purchase Price", and
  the itemization carries neither. It is a numbered three-column grid, not a
  label/value/content table.
*/

describe('Lombard_CA_Itemization_v1 against 10 CCR §956', () => {
  it('carries every prescribed description, in the prescribed order, with sound cross-references', () => {
    expect(checkItemization(CA_ITEMIZATION, caRendered)).toEqual([]);
  });
});

describe('Lombard_NY_Itemization_v1 against 23 NYCRR §600.17', () => {
  it('carries every prescribed description, in the prescribed order, with sound cross-references', () => {
    expect(checkItemization(NY_ITEMIZATION, nyRendered)).toEqual([]);
  });
});

/*
  The two documents really are identical apart from the citation under the
  title, and here that is CORRECT rather than the defect it would be on the
  offer summaries. §956(a)(1)-(6) and §600.17(a)(1)-(6) prescribe the same six
  descriptions in the same order.

  Asserted both ways round, because "they agree" is a claim about the
  regulations that can stop being true: each spec is checked against its OWN
  vendored file below, so a New York amendment breaks New York alone.
*/
describe('the two states genuinely prescribe the same itemization', () => {
  it('each document satisfies the other state’s spec, today', () => {
    expect(checkItemization(NY_ITEMIZATION, caRendered)).toEqual([]);
    expect(checkItemization(CA_ITEMIZATION, nyRendered)).toEqual([]);
  });

  it('and the specs are still two objects, reachable from one state each', () => {
    expect(CA_ITEMIZATION).not.toBe(NY_ITEMIZATION);
    expect(CA_ITEMIZATION.jurisdiction).toBe('US-CA');
    expect(NY_ITEMIZATION.jurisdiction).toBe('US-NY');
    expect(CA_ITEMIZATION.sourceFile).not.toBe(NY_ITEMIZATION.sourceFile);
    expect(CA_ITEMIZATION.sourceDigest).not.toBe(NY_ITEMIZATION.sourceDigest);
  });
});

/*
  THE SCOPING, WHICH IS WHERE AN ITEMIZATION SPEC IS EASIEST TO GET WRONG.

  "Amount Financed" is a §900 defined term used all through California's file,
  and "Prepaid Finance Charge" appears in §943 and in several of the §910-§917
  tables. A spec checked against the whole file would find every description it
  looked for even if it had drifted onto a different section entirely.

  These two assertions are what makes §956's `section` load-bearing rather than
  decorative: inside §956 the descriptions are all there, and inside §914 —
  which is 900 lines away in the same file and prescribes the document the
  itemization ACCOMPANIES — most of them are not.
*/
describe('§956 is checked against §956 and not against the file', () => {
  const whole = readFileSync(join(__dirname, '../sources/CA-10CCR-900-956.txt'), 'utf8');

  it('every prescribed description is in §956', () => {
    const section = sectionOf(whole, CA_ITEMIZATION.section);

    expect(section).not.toBeNull();
    expect(checkItemizationAgainstSource(CA_ITEMIZATION, section ?? '')).toEqual([]);
  });

  it('but not in §914, the section it would silently borrow from', () => {
    const section = sectionOf(whole, CA_OFFER_SUMMARY.section);
    const out = checkItemizationAgainstSource(CA_ITEMIZATION, section ?? '');

    expect(out.length).toBeGreaterThan(0);
    expect(out.every((d) => d.kind === 'not-in-source')).toBe(true);
  });
});

/*
  What no check here can stand behind, as a number.

  §956(a)(3) requires a line for each third-party payee and prescribes no
  wording for it, so one of six lines on each document has text nobody has
  checked against anything. Pinned so the unchecked surface cannot grow
  unnoticed — the same discipline `coverage()` applies to the tables.
*/
describe('the unchecked surface is declared', () => {
  it('is exactly one line per itemization, under §956(a)(3) / §600.17(a)(3)', () => {
    expect(itemizationCoverage(CA_ITEMIZATION)).toEqual({ described: 5, total: 6, undescribed: 1 });
    expect(itemizationCoverage(NY_ITEMIZATION)).toEqual({ described: 5, total: 6, undescribed: 1 });
  });
});
