import { describe, expect, it } from 'vitest';
import { checkFormConformity } from '../prescribed/conformity';
import { CA_OFFER_SUMMARY } from '../prescribed/forms/ca-offer-summary';
import noDeductions from './ca-nodeductions-rows.fixture.json';
import rendered from './ca-rows.fixture.json';

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

  /*
    'row-mismatch' and 'text-divergence' stood here until 2026-09-06. Neither is
    a Divergence kind, so both filters returned [] whatever the form said and
    both assertions passed vacuously. They were written before the union was
    settled and never re-read against it; `tsc` found them the first time the
    package was actually typechecked, which had not happened because an earlier
    run pointed at a tsconfig that does not exist and quietly did nothing.

    The lesson is the one this package exists to enforce, turned on itself: a
    green assertion is evidence only if it could have been red.
  */
  it('has the rows §914 prescribes, in order', () => {
    expect(divergences.filter((d) => d.kind === 'row-count')).toEqual([]);
    expect(divergences.filter((d) => d.kind === 'label')).toEqual([]);
  });

  it('carries no unauthorised words in a row the regulation closes', () => {
    // eslint-disable-next-line no-console
    if (divergences.length) {
      console.log(`\n${divergences.map((d) => `  - ${d.detail}`).join('\n')}`);
    }

    expect(divergences.filter((d) => d.kind === 'unauthorised-addition')).toEqual([]);
  });

  it('reproduces the prescribed wording exactly', () => {
    expect(divergences.filter((d) => d.kind === 'verbatim')).toEqual([]);
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
