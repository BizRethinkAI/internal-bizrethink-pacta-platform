import { describe, expect, it } from 'vitest';
import { checkFormConformity } from '../prescribed/conformity';
import { CA_OFFER_SUMMARY } from '../prescribed/forms/ca-offer-summary';
import rendered from './ca-rows.fixture.json';
import noDeductions from './ca-nodeductions-rows.fixture.json';

/*
  Lombard's shipped California disclosure, checked row by row against 10 CCR
  §914 as transcribed in the spec.

  The fixture is extracted from sources/Lombard_CA_Disclosure_v1.docx in the
  lombard-contracts repo — the document we actually publish, not a
  reconstruction of it. When that document changes, this fixture is regenerated
  and this test is the thing that says whether the change was lawful.
*/
describe('Lombard_CA_Disclosure_v1 against 10 CCR §914', () => {
  const divergences = checkFormConformity(CA_OFFER_SUMMARY, rendered);

  it('has the rows §914 prescribes, in order', () => {
    expect(divergences.filter((d) => d.kind === 'row-mismatch')).toEqual([]);
  });

  it('carries no unauthorised words in a row the regulation closes', () => {
    // eslint-disable-next-line no-console
    if (divergences.length) console.log('\n' + divergences.map((d) => `  - ${d.detail}`).join('\n'));

    expect(divergences.filter((d) => d.kind === 'unauthorised-addition')).toEqual([]);
  });

  it('reproduces the prescribed wording exactly', () => {
    expect(divergences.filter((d) => d.kind === 'text-divergence')).toEqual([]);
  });
});

/*
  The "no deductions" variant, for a transaction where the amount financed
  equals the recipient funds. Row 0 then omits the deduction sentence entirely,
  which is the correct behaviour and not an omission: §914(a)(2)(C)(ii) is
  conditional on the amount financed being greater. A row that carried it anyway
  would be telling the recipient about deductions that do not exist.
*/
describe('Lombard_CA_Disclosure_NoDeductions_v1 against 10 CCR §914', () => {
  it('conforms', () => {
    expect(checkFormConformity(CA_OFFER_SUMMARY, noDeductions)).toEqual([]);
  });
});
