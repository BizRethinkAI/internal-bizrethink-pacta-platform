import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkAgainstSource, checkFormConformity } from '../prescribed/conformity';
import { VA_DISCLOSURE } from '../prescribed/forms/va-disclosure';
import { originOfSource } from '../provenance/source-origin';
import { readSourceText } from '../provenance/source-text';
import { verifyProvenance } from '../provenance/verify';
import officialRows from './va-official-rows.fixture.json';
import legacyRows from './va-rows.fixture.json';

const evidence = (file: string) =>
  readFileSync(resolve(__dirname, '../../../../docs/research/mca-source-audit-2026-09-12/evidence', file));
const officialText = evidence('va-official-disclosure-form.txt').toString('utf8');

describe('Virginia uses the official October 2022 prescribed form', () => {
  it.each(['txt', 'layout.txt'])('retains the complete independent %s extraction, including page two', (extension) => {
    const source = readSourceText(`VA-Disclosure-Form.${extension}`);
    const body = source.split('--- OFFICIAL FORM TEXT BEGINS ---')[1]?.trim();

    expect(body).toBe(evidence(`va-official-disclosure-form.${extension}`).toString('utf8').trim());
    expect(body?.match(/Eff\. 10\/2022/g)).toHaveLength(2);
    expect(originOfSource(`VA-Disclosure-Form.${extension}`).origin).toBe('official-publisher');
  });

  it('retains the unmodified PDF as the layout authority', () => {
    const pdf = readFileSync(resolve(__dirname, '../sources/VA-Disclosure-Form.pdf'));

    expect(pdf).toEqual(evidence('va-official-disclosure-form.pdf'));
    expect(createHash('sha256').update(pdf).digest('hex')).toBe(
      '146da959abc2581a47fd9839da3771630bc63a0b915a5596cd8a2d4941e18b29',
    );
  });

  it('retains the complete implementing rules behind the format and completion instructions', () => {
    const capture = evidence('va-10vac5-240-current.txt').toString('utf8');
    const rules = capture.slice(capture.indexOf('10VAC5-240-10. Definitions.')).split('Forms (10VAC5-240)')[0]?.trim();
    const body = readSourceText('VA-10VAC5-240.txt').split('--- REGULATORY TEXT BEGINS ---')[1]?.trim();

    expect(body).toBe(rules);
    expect(body).toContain('12 CFR 1026.4');
    expect(body).toContain('10VAC5-240-40. Commission authority.');
  });

  it('checks the spec against the independent official source', () => {
    expect(checkAgainstSource(VA_DISCLOSURE, officialText)).toEqual([]);
    expect(verifyProvenance(VA_DISCLOSURE)).toEqual([]);
  });

  it('accepts the static row text transcribed from the official PDF', () => {
    // The fixture is the blank official form's row text, not a rebuilt merchant
    // document. Values, checkbox selections and page geometry need other checks.
    expect(checkFormConformity(VA_DISCLOSURE, officialRows)).toEqual([]);
  });

  it('identifies all four known row-text mismatches in the unchanged legacy specimen', () => {
    expect(checkFormConformity(VA_DISCLOSURE, legacyRows).map(({ kind, row }) => ({ kind, row }))).toEqual([
      { kind: 'label', row: 0 },
      { kind: 'label', row: 2 },
      { kind: 'label', row: 5 },
      { kind: 'label', row: 6 },
    ]);
  });

  it.each([
    [0, 'Total Amount of the Sales-Based Financing', 'Total Amount Financed'],
    [2, 'Total Amount of the Sales-Based Financing', 'Total Amount Financed'],
    [2, 'minus (-)', 'plus (+)'],
    [4, 'plus (+)', 'minus (-)'],
    [5, 'ONLY', 'also'],
    [5, 'variable payment schedule', 'fixed payment schedule'],
    [6, 'Payment Schedule', 'Payment Schedule ☐ Fixed ☒ Variable'],
  ] as const)('rejects changed prescribed text in row %s (%s)', (index, from, to) => {
    const changed = officialRows.map((row, i) => (i === index ? { ...row, label: row.label.replace(from, to) } : row));

    expect(checkFormConformity(VA_DISCLOSURE, changed)).toContainEqual(
      expect.objectContaining({ kind: 'label', row: index }),
    );
  });

  it('checks bracketed formula text literally against the source', () => {
    const altered = officialText.replace('minus (-)', 'plus (+)');

    expect(checkAgainstSource(VA_DISCLOSURE, altered)).toContainEqual(
      expect.objectContaining({ kind: 'not-in-source', row: 2 }),
    );
  });

  it('does not verify the number-of-payments instruction without its range qualification', () => {
    const altered = officialText.replace(
      /A reasonable range may be provided ONLY for\s+transactions with a variable payment schedule\./,
      '',
    );

    expect(checkAgainstSource(VA_DISCLOSURE, altered)).toContainEqual(
      expect.objectContaining({ kind: 'not-in-source', row: 5 }),
    );
  });

  it('the publishability check also rejects an unsupported label instruction', () => {
    const altered = {
      ...VA_DISCLOSURE,
      rows: VA_DISCLOSURE.rows.map((row) =>
        row.label === 'Disbursement Amount' ? { ...row, labelSuffix: '[A made-up formula]' } : row,
      ),
    };

    expect(verifyProvenance(altered)).toContainEqual(
      expect.objectContaining({ kind: 'verbatim', detail: expect.stringContaining('A made-up formula') }),
    );
  });
});
