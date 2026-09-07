import { describe, expect, it } from 'vitest';
import { checkFormConformity } from '../prescribed/conformity';
import { syntheticForm } from './synthetic-form';

/*
  10 CCR §915(a)(7) and 23 NYCRR §600.14(g): the Term row "shall include NO
  information in the third column".

  A THIRD KIND OF ROW RULE, and the checker could not see it. Until now a row
  was either one the regulation words (`verbatim`) or one it leaves to the
  provider (`verbatim: null`), and `checkFormConformity` returned early on the
  second — label checked, contents not looked at. A row that must be EMPTY is
  neither: the regulation says exactly what belongs there, and what belongs
  there is nothing.

  So the rule is expressible only as its own flag, and it is worth having
  because it is the one content rule in the whole lease table a machine can
  decide. Everything else §915 leaves to the provider it describes rather than
  words — the finance-charge calculation, the payment explanation — and those
  stay unchecked and counted as unchecked.

  These two cases are the evidence that the check can be red. The lease
  conformity tests below assert an empty Term row on the real documents; that
  assertion means nothing unless a non-empty one is rejected here.
*/
describe('a row the regulation says shall carry no third-column information', () => {
  const form = syntheticForm({
    slug: 'synthetic-term-row',
    citation: '10 CCR §915(a)(7)',
    sourceFile: 'CA-10CCR-900-956.txt',
    rows: [{ label: 'Term', verbatim: null, onlyPrescribedContent: true, thirdColumnEmpty: true }],
  });

  it('accepts the row when the third column is empty', () => {
    expect(checkFormConformity(form, [{ label: 'Term', value: '12 months', content: '' }])).toEqual([]);
  });

  it('rejects the row when the third column carries anything at all', () => {
    const out = checkFormConformity(form, [
      { label: 'Term', value: '12 months', content: 'This is how long your lease runs.' },
    ]);

    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe('unauthorised-addition');
    expect(out[0]?.detail).toContain('no information in the third column');
  });

  /*
    The flag is not a synonym for `verbatim: null`. A row the provider words —
    §915(a)(4)(C)'s finance-charge calculation — must still accept prose, or
    every lease form in the library becomes a false positive.
  */
  it('leaves an ordinary provider-worded row alone', () => {
    const ordinary = syntheticForm({
      slug: 'synthetic-finance-charge-row',
      citation: '10 CCR §915(a)(4)',
      sourceFile: 'CA-10CCR-900-956.txt',
      rows: [{ label: 'Finance Charge', verbatim: null, onlyPrescribedContent: true }],
    });

    expect(
      checkFormConformity(ordinary, [
        { label: 'Finance Charge', value: '$1,000', content: 'The finance charge is made up of …' },
      ]),
    ).toEqual([]);
  });
});
