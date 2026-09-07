import { describe, expect, it } from 'vitest';
import { checkItemization, type ItemizationForm, type RenderedItem } from '../prescribed/itemization';

/*
  THE ITEMIZATION IS NOT AN OFFER SUMMARY, AND `checkFormConformity` IS THE
  WRONG CHECKER FOR IT.

  10 CCR §956(a) and 23 NYCRR §600.17(a) require a document "substantially
  similar in form to the example disclosure … INCLUDING AT A MINIMUM" the six
  items they list. Three consequences, each of which breaks something the
  offer-summary checker assumes:

    - there is no prescribed line count, so a `row-count` divergence would fire
      on every correct form;
    - §956(a)(3) puts each third-party payee on its OWN line, so the number of
      lines is a property of the deal and positional row alignment goes wrong
      the moment a deal has two payees;
    - no line is closed with "shall include only" — §956(c)(4) expressly permits
      a statement of assumptions below the required items — so there is nothing
      for the `unauthorised-addition` check to mean.

  What replaces them is an in-order SUBSEQUENCE match, which is what "including
  at a minimum" says, plus the one thing this document has that no table has:
  §956(a)(4) and (a)(6) require each computed line to carry "a reference to how
  the amount was calculated". That reference names LINE POSITIONS, so it goes
  silently stale the instant a payee line is added — and a stale reference on a
  document whose entire purpose is to show the reader a subtraction is a
  document that lies about its own arithmetic.

  Every case below is the defective instance for one of those checks. A green
  itemization test means nothing unless these are red.
*/

const spec: ItemizationForm = {
  slug: 'synthetic-itemization',
  citation: '10 CCR §956',
  sourceFile: 'CA-10CCR-900-956.txt',
  jurisdiction: 'US-CA',
  transaction: 'any-commercial-financing',
  status: 'draft',
  source: {
    kind: 'regulator-prescribed-form',
    citation: '10 CCR §956',
    sourceFile: 'CA-10CCR-900-956.txt',
    verbatimVerifiedAt: null,
    structureVerifiedAt: null,
  },
  sourceDigest: 'not-a-verified-form',
  section: null,
  structureEvidence: 'source-order',
  lines: [
    { id: 'given-directly', description: 'Amount Given Directly to You', citation: '§956(a)(1)', reference: null },
    { id: 'on-account', description: 'Amount Paid on your Account with Us', citation: '§956(a)(2)', reference: null },
    { id: 'to-others', description: null, citation: '§956(a)(3)', reference: null },
    {
      id: 'provided-total',
      description: 'Amount Provided to You or on Your Behalf',
      citation: '§956(a)(4)',
      reference: { kind: 'sum-of-preceding' },
    },
    { id: 'prepaid', description: 'Prepaid Finance Charges', citation: '§956(a)(5)', reference: null },
    {
      id: 'amount-financed',
      description: 'Amount Financed',
      citation: '§956(a)(6)',
      reference: { kind: 'difference', minuend: 'provided-total', subtrahend: 'prepaid' },
    },
  ],
};

const line = (number: number, description: string): RenderedItem => ({
  number: `${number}.`,
  description,
  amount: '$0',
});

/** One payee line, which is the shape both shipped itemizations have. */
const onePayee: RenderedItem[] = [
  line(1, 'Amount Given Directly to You'),
  line(2, 'Amount Paid on your Account with Us'),
  line(3, 'Paid on your behalf to [payee]'),
  line(4, 'Amount Provided to You or on Your Behalf (Sum of Items 1-3)'),
  line(5, 'Prepaid Finance Charges: Origination Fee'),
  line(6, 'Amount Financed (Item 4 minus Item 5)'),
];

describe('the itemization checker', () => {
  it('accepts a form carrying every prescribed description in the prescribed order', () => {
    expect(checkItemization(spec, onePayee)).toEqual([]);
  });

  /*
    "Including at a minimum" means EXTRA LINES ARE LAWFUL, and this is the
    assertion that stops a later tightening turning the checker into a
    false-positive machine. It has to be a test rather than a comment: the
    tempting change — align lines positionally, as the offer summary does —
    passes every other case in this file and fails only this one.
  */
  it('accepts a second payee line, with the cross-references moved on', () => {
    const twoPayees: RenderedItem[] = [
      line(1, 'Amount Given Directly to You'),
      line(2, 'Amount Paid on your Account with Us'),
      line(3, 'Paid on your behalf to [first payee]'),
      line(4, 'Paid on your behalf to [second payee]'),
      line(5, 'Amount Provided to You or on Your Behalf (Sum of Items 1-4)'),
      line(6, 'Prepaid Finance Charges: Origination Fee'),
      line(7, 'Amount Financed (Item 5 minus Item 6)'),
    ];

    expect(checkItemization(spec, twoPayees)).toEqual([]);
  });

  it('rejects a second payee line whose cross-references were left behind', () => {
    const stale: RenderedItem[] = [
      line(1, 'Amount Given Directly to You'),
      line(2, 'Amount Paid on your Account with Us'),
      line(3, 'Paid on your behalf to [first payee]'),
      line(4, 'Paid on your behalf to [second payee]'),
      line(5, 'Amount Provided to You or on Your Behalf (Sum of Items 1-3)'),
      line(6, 'Prepaid Finance Charges: Origination Fee'),
      line(7, 'Amount Financed (Item 4 minus Item 5)'),
    ];

    const out = checkItemization(spec, stale);

    expect(out.map((d) => d.kind)).toEqual(['cross-reference', 'cross-reference']);
    expect(out[0]?.detail).toContain('1, 2, 3, 4');
    expect(out[1]?.detail).toContain('5, 6');
  });

  it('rejects a form that omits a prescribed description', () => {
    const out = checkItemization(
      spec,
      onePayee.filter((r) => !r.description.startsWith('Prepaid')),
    );

    expect(out.some((d) => d.kind === 'missing-line')).toBe(true);
    expect(out.map((d) => d.detail).join(' ')).toContain('Prepaid Finance Charges');
  });

  it('rejects a form whose prescribed descriptions are present but out of order', () => {
    const swapped: RenderedItem[] = [
      line(1, 'Amount Given Directly to You'),
      line(2, 'Amount Paid on your Account with Us'),
      line(3, 'Paid on your behalf to [payee]'),
      line(4, 'Amount Financed (Item 5 minus Item 6)'),
      line(5, 'Amount Provided to You or on Your Behalf (Sum of Items 1-3)'),
      line(6, 'Prepaid Finance Charges: Origination Fee'),
    ];

    const out = checkItemization(spec, swapped);

    expect(out.some((d) => d.kind === 'out-of-order')).toBe(true);
  });

  it('rejects a form whose lines are not numbered consecutively from one', () => {
    const misnumbered = onePayee.map((r, i) => (i === 3 ? { ...r, number: '7.' } : r));
    const out = checkItemization(spec, misnumbered);

    expect(out.some((d) => d.kind === 'numbering')).toBe(true);
  });

  /*
    §956(a)(3) requires a line for each third-party payee and prescribes no
    wording for it, so the spec holds `description: null` and the checker has
    nothing to compare. Recorded here rather than left implicit: a null
    description must not be treated as "matches anything", which would let the
    subsequence walk consume a prescribed line and mask a real omission.
  */
  it('does not let an unworded line stand in for a prescribed one', () => {
    const out = checkItemization(spec, [
      line(1, 'Amount Given Directly to You'),
      line(2, 'Paid on your behalf to [payee]'),
      line(3, 'Amount Provided to You or on Your Behalf (Sum of Items 1-2)'),
      line(4, 'Prepaid Finance Charges: Origination Fee'),
      line(5, 'Amount Financed (Item 3 minus Item 4)'),
    ]);

    expect(out.map((d) => d.kind)).toEqual(['missing-line']);
    expect(out[0]?.detail).toContain('Amount Paid on your Account with Us');
  });
});
