import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkAgainstSource, checkFormConformity, coverage } from '../prescribed/conformity';
import { NY_OFFER_SUMMARY } from '../prescribed/forms/ny-offer-summary';
import noDeductions from './ny-nodeductions-rows.fixture.json';
import rendered from './ny-rows.fixture.json';

const source = readFileSync(join(__dirname, '../sources/NY-23NYCRR-600.txt'), 'utf8');

describe('the NY spec against 23 NYCRR §600.6', () => {
  it('is transcribed from the regulation, every row', () => {
    expect(checkAgainstSource(NY_OFFER_SUMMARY, source)).toEqual([]);
  });
});

describe('Lombard_NY_Disclosure_v1 against 23 NYCRR §600.6', () => {
  const divergences = checkFormConformity(NY_OFFER_SUMMARY, rendered);

  it('reports how much of the form it can see', () => {
    // Five of eleven rows prescribe "a short explanation" rather than words, so
    // this checker reads their labels and nothing else. Stated, not implied.
    expect(coverage(NY_OFFER_SUMMARY)).toEqual({ checked: 6, total: 11, unchecked: 5 });
  });

  it('conforms', () => {
    // eslint-disable-next-line no-console
    if (divergences.length) {
      console.log(`\n${divergences.map((d) => `  - ${d.detail}`).join('\n')}`);
    }

    expect(divergences).toEqual([]);
  });
});

describe('Lombard_NY_Disclosure_NoDeductions_v1 against 23 NYCRR §600.6', () => {
  it('conforms', () => {
    expect(checkFormConformity(NY_OFFER_SUMMARY, noDeductions)).toEqual([]);
  });
});
