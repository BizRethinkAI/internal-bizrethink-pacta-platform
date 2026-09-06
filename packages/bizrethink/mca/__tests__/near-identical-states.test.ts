import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkAgainstSource } from '../prescribed/conformity';
import type { PrescribedForm } from '../prescribed/types';
import { syntheticForm } from './synthetic-form';

/*
  The trap this whole library exists to survive.

  California 10 CCR §914 and New York 23 NYCRR §600.6(c)(3) prescribe an APR
  paragraph that is identical but for two words: CA says "fees you pay", NY says
  "finance charges you pay". Both are right. Neither may be edited toward the
  other, and a session tidying them into consistency — a plainly reasonable
  instinct — breaks whichever one it moves.

  REVIEW-01 found the NY form carrying California's wording. It was fixed by
  reading both regulations; this test is that reading, made permanent.
*/

const src = (f: string) => readFileSync(join(__dirname, '../sources', f), 'utf8');
const CA = src('CA-10CCR-900-956.txt');
const NY = src('NY-23NYCRR-600.txt');

const apr = (slug: string, citation: string, sourceFile: string, verbatim: string): PrescribedForm =>
  syntheticForm({
    slug,
    citation,
    sourceFile,
    rows: [{ label: 'Finance Charge', verbatim, onlyPrescribedContent: false }],
  });

const CA_TEXT =
  'APR incorporates the amount and timing of the funding you receive, fees you pay, and the periodic payments you make.';
const NY_TEXT =
  'APR incorporates the amount and timing of the funding you receive, finance charges you pay, and the periodic payments you make.';

describe('near-identical states must not be reconciled', () => {
  /*
    THIS TEST IS NOT DUPLICATED CODE. Do not deduplicate it.

    The two constants below look like a copy-paste slip and are the opposite:
    they are two regulators prescribing the same sentence with one phrase
    different, and the difference is load-bearing. A future session's instinct
    will be to hoist them into one constant with a parameter. This assertion
    exists so that instinct fails the build rather than the form — a comment
    asking for restraint is not a guard, and the lesson of this codebase today
    is that an invariant nobody can break by accident beats an invariant
    everybody has been asked to respect.
  */
  it('keeps the two prescribed texts genuinely different', () => {
    expect(CA_TEXT).not.toEqual(NY_TEXT);
    expect(CA_TEXT).toContain('fees you pay');
    expect(NY_TEXT).toContain('finance charges you pay');
  });

  it('accepts each state against its own regulation', () => {
    expect(checkAgainstSource(apr('ca', '10 CCR §914', 'CA', CA_TEXT), CA)).toEqual([]);
    expect(checkAgainstSource(apr('ny', '23 NYCRR §600.6', 'NY', NY_TEXT), NY)).toEqual([]);
  });

  it('rejects California wording checked against New York', () => {
    const out = checkAgainstSource(apr('ny', '23 NYCRR §600.6', 'NY', CA_TEXT), NY);
    expect(out.map((d) => d.kind)).toEqual(['not-in-source']);
  });

  it('rejects New York wording checked against California', () => {
    const out = checkAgainstSource(apr('ca', '10 CCR §914', 'CA', NY_TEXT), CA);
    expect(out.map((d) => d.kind)).toEqual(['not-in-source']);
  });
});

/*
  The same trap, second instance — and the one that makes the case for building
  this at all.

  The APR pair above was found by REVIEW-01, by a human reading both
  regulations. THIS pair was not: it survived that review and shipped to Pacta
  as templates 104 and 105. The conformity checker found it on 2026-09-06, on
  its first run against a real document.

  §914(a)(2)(C)(ii) and §600.6(b) prescribe the deduction sentence with four
  words different, and our California form carried New York's. Note also that
  New York is not internally uniform: §600.6(b) says "the amounts that will be
  deducted" while §600.11 and §600.12 say "what amounts will be deducted", so
  "the New York wording" is not even a well-formed idea — only the wording of a
  specific section is.
*/
const CA_DEDUCTION = 'For more information on what amounts will be deducted';
const NY_600_6_DEDUCTION = 'For more information on the amounts that will be deducted';

describe('the deduction sentence differs between CA §914 and NY §600.6', () => {
  const form = (verbatim: string) =>
    syntheticForm({
      slug: 'deduction',
      citation: 'n/a',
      sourceFile: 'n/a',
      rows: [{ label: 'Funding Provided', verbatim, onlyPrescribedContent: false }],
    });

  it('keeps the two prescribed texts genuinely different', () => {
    expect(CA_DEDUCTION).not.toEqual(NY_600_6_DEDUCTION);
  });

  it('accepts each against its own regulation', () => {
    expect(checkAgainstSource(form(CA_DEDUCTION), CA)).toEqual([]);
    expect(checkAgainstSource(form(NY_600_6_DEDUCTION), NY)).toEqual([]);
  });

  it("rejects New York's phrasing against California — the defect that shipped", () => {
    const out = checkAgainstSource(form(NY_600_6_DEDUCTION), CA);
    expect(out.map((d) => d.kind)).toEqual(['not-in-source']);
  });
});
