import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ALL_MCA_CLAUSES } from '../clauses/library';
import { UT_DISCLOSURE } from '../content/statutes/ut';
import { checkContentCoverage } from '../content/types';
import { originOfSource } from '../provenance/source-origin';
import { norm, readSourceText } from '../provenance/source-text';
import utRows from './ut-rows.fixture.json';

const research = (folder: string, file: string) =>
  readFileSync(resolve(__dirname, '../../../../docs/research', folder, file), 'utf8');

const statutoryBody = (text: string) => text.split('--- STATUTORY TEXT BEGINS ---').at(-1) ?? '';

describe('Utah disclosure findings point to the disclosure duty, not registration', () => {
  it('cites §202(2) on the disclosure and its provenance', () => {
    expect(UT_DISCLOSURE.citation).toBe('Utah Code §7-27-202(2)');
    expect(UT_DISCLOSURE.source).toMatchObject({
      kind: 'statute',
      citation: 'Utah Code §7-27-202(2)',
    });
  });

  it.each([
    ['Total Funds Provided', '(a)'],
    ['Total Funds Disbursed', '(b)'],
    ['Total Amount to Repay', '(c)'],
    ['Total Dollar Cost', '(d)'],
    ['Estimated Periodic Payment', '(e)(ii)'],
    ['Prepayment', '(f)'],
  ])('a missing %s row cites §202(2)%s', (label, paragraph) => {
    const gaps = checkContentCoverage(
      UT_DISCLOSURE,
      utRows.filter((row) => !row.label.includes(label)),
    );

    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      kind: 'row-missing',
      citation: `Utah Code §7-27-202(2)${paragraph}`,
    });
  });

  it('places variable-payment methodology in the agreement under §202(3)', () => {
    const payment = UT_DISCLOSURE.requirements.find((requirement) => requirement.row === 'Estimated Periodic Payment');

    expect(payment?.requires).toContain('AGREEMENT under §7-27-202(3)');
    expect(checkContentCoverage(UT_DISCLOSURE, utRows)).toEqual([]);
  });

  it('records the official retrieval while retaining the complete independently audited body', () => {
    const source = readSourceText(UT_DISCLOSURE.sourceFile);
    const audit = JSON.parse(research('mca-source-audit-2026-09-12', 'manifest.json')) as {
      comparisons: { id: string; right_normalized_sha256: string }[];
    };
    const comparison = audit.comparisons.find((entry) => entry.id === UT_DISCLOSURE.sourceFile);
    const digest = createHash('sha256').update(statutoryBody(source).replace(/\s+/g, ' ').trim()).digest('hex');

    expect(comparison).toBeDefined();
    expect(digest).toBe(comparison?.right_normalized_sha256);
    expect(originOfSource(UT_DISCLOSURE.sourceFile).origin).toBe('official-publisher');
    expect(source).toContain('https://le.utah.gov/xcode/Title7/Chapter27/C7-27_2022050420220504.pdf');
    expect(source).toContain('2026-09-12T08:39:57.332228+00:00');
  });
});

describe('California references use the January 2026 statutory numbering', () => {
  const file = 'CA-Fin-Code-22800-22807.txt';
  const section = (number: number) =>
    readSourceText(file)
      .split(`\n${number}.\n`)[1]
      ?.split(/\n228\d\d\.\n/)[0] ?? '';

  it('retains all eight sections from the independently captured current code', () => {
    const capture = research('mca-agreement-requirements-2026-09-12', 'evidence/ca-finance-22800-22807.txt');
    const body = capture.slice(capture.indexOf('\n22800.\n')).split('\nFINFinancial Code - FIN')[0];
    const source = readSourceText(file);

    expect(body).toContain('\n22807.\n');
    expect(norm(statutoryBody(source))).toBe(norm(body));
    expect(originOfSource(file).origin).toBe('official-publisher');
  });

  it('distinguishes estimated APR, pricing communications and enforcement after SB 362', () => {
    expect(section(22805)).toContain('Estimated APR disclosed in conformity');
    expect(section(22805)).toContain('Added by renumbering Section 22806');
    expect(norm(section(22806))).toContain('(b) After extending a specific offer to a potential recipient');
    expect(section(22806)).toContain('annual percentage rate');
    expect(section(22807)).toContain('California Consumer Financial Protection Law');
    for (const number of [22805, 22806, 22807]) {
      expect(section(number)).toContain('Effective January 1, 2026.');
    }
  });

  it('the live state-rider assessment identifies the pricing-communication paragraph', () => {
    const rider = ALL_MCA_CLAUSES.find((clause) => clause.slug === 'frpa.state-law-riders-7-24');

    expect(rider?.whyThisClause).toMatchObject({
      kind: 'implements',
      citation: expect.stringContaining('Cal. Fin. Code §22806(b)'),
    });
  });
});
