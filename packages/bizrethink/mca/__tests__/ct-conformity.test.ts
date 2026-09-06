import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkAgainstSource, checkFormConformity } from '../prescribed/conformity';
import { CT_DISCLOSURE } from '../prescribed/forms/ct-disclosure';
import { VA_DISCLOSURE } from '../prescribed/forms/va-disclosure';
import rendered from './ct-rows.fixture.json';

const source = readFileSync(join(__dirname, '../sources/CT-DOB-Guidance.txt'), 'utf8');

describe('the CT spec against Appendix A', () => {
  it('is transcribed from the appendix, every label', () => {
    expect(checkAgainstSource(CT_DISCLOSURE, source)).toEqual([]);
  });
});

describe('Lombard_CT_Disclosure_v1 against Appendix A', () => {
  it('carries the prescribed rows, in order', () => {
    const divergences = checkFormConformity(CT_DISCLOSURE, rendered);

    // eslint-disable-next-line no-console
    if (divergences.length) console.log('\n' + divergences.map((d) => `  - ${d.detail}`).join('\n'));

    expect(divergences).toEqual([]);
  });
});

/*
  Connecticut's Department of Banking states that it has not determined any
  other state's form to meet or exceed Connecticut's requirements, so a
  substitution is not available even where the forms look alike. Virginia's is
  the closest and the likeliest to be reached for.
*/
describe('Connecticut and Virginia are not interchangeable', () => {
  it('differ in their prescribed labels', () => {
    const ct = CT_DISCLOSURE.rows.map((r) => r.label);
    const va = VA_DISCLOSURE.rows.map((r) => r.label);

    expect(ct).not.toEqual(va);
    // The specific traps: charges vs fees, time period vs number of payments.
    expect(ct).toContain('Finance Charges Deducted or Withheld at Disbursement');
    expect(va).toContain('Fees Deducted or Withheld at Disbursement');
    expect(va).toContain('Estimated Number of Payments');
    expect(ct.some((l) => l.startsWith('Estimated Time Period'))).toBe(true);
  });
});
