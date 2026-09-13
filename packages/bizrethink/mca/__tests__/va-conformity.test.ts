import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkAgainstSource, checkFormConformity } from '../prescribed/conformity';
import { VA_DISCLOSURE, VA_HEADER_LABELS } from '../prescribed/forms/va-disclosure';
import rendered from './va-rows.fixture.json';

const source = readFileSync(join(__dirname, '../sources/VA-Disclosure-Form.txt'), 'utf8');

describe('the VA spec against the Commonwealth form', () => {
  it('is transcribed from the form, every label', () => {
    expect(checkAgainstSource(VA_DISCLOSURE, source)).toEqual([]);
  });

  it('has every header label the form prints', () => {
    const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
    const missing = VA_HEADER_LABELS.filter((l) => !norm(source).includes(norm(l)));

    expect(missing).toEqual([]);
  });
});

describe('Lombard_VA_Disclosure_v1 against the Commonwealth form', () => {
  it('reports the four prescribed-label mismatches in the retained legacy specimen', () => {
    const divergences = checkFormConformity(VA_DISCLOSURE, rendered);
    expect(divergences.map(({ kind, row }) => ({ kind, row }))).toEqual([
      { kind: 'label', row: 0 },
      { kind: 'label', row: 2 },
      { kind: 'label', row: 5 },
      { kind: 'label', row: 6 },
    ]);
  });
});
