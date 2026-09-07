import { describe, expect, it } from 'vitest';
import { MCA_JURISDICTIONS } from '../jurisdictions';
import { disclosuresFor, ITEMIZATIONS, PRESCRIBED_FORMS, prescribedFormsForTransaction } from '../registry';
import { MCA_TRANSACTION_TYPES } from '../transactions';

/*
  THE SECOND AXIS, AND WHY IT HAD TO EXIST BEFORE THE LEASE FORMS COULD LAND.

  `jurisdiction.test.ts` pins the first: no state's text can reach another
  state's document. That was the whole safety property while every spec in the
  library was a sales-based financing disclosure and `disclosuresFor('US-CA')`
  returned exactly one thing.

  It returns three now. California prescribes six different tables in one
  regulation and two of them are ours, and §915's lease table makes affirmative
  statements a sales-based advance cannot support — a purchase option, an
  anticipated cost of acquiring property at the end of a lease term. Sending it
  with a merchant cash advance would be the same class of defect as sending New
  York's sentence on a California form: the right shape, the wrong instrument.

  The source-level version of this hazard is already documented in
  `provenance/source-text.ts` — New York's own file carries California's
  phrasing of the funding-provided sentence in §600.11 and §600.12, sections
  governing other transaction types. This is the registry-level version.
*/

describe('the transaction axis filters', () => {
  it('a sales-based deal in California cannot reach the §915 lease table', () => {
    const slugs = prescribedFormsForTransaction('US-CA', 'sales-based-financing').map((f) => f.slug);

    expect(slugs).toContain('ca-offer-summary');
    expect(slugs).not.toContain('ca-lease-financing');
  });

  it('a lease in California cannot reach the §914 sales-based table', () => {
    const slugs = prescribedFormsForTransaction('US-CA', 'lease-financing').map((f) => f.slug);

    expect(slugs).toContain('ca-lease-financing');
    expect(slugs).not.toContain('ca-offer-summary');
  });

  it('New York is filtered the same way, independently', () => {
    expect(prescribedFormsForTransaction('US-NY', 'sales-based-financing').map((f) => f.slug)).toEqual([
      'ny-offer-summary',
      'ny-itemization',
    ]);
    expect(prescribedFormsForTransaction('US-NY', 'lease-financing').map((f) => f.slug)).toEqual([
      'ny-lease-financing',
      'ny-itemization',
    ]);
  });

  /*
    §956(a) applies "when a provider provides a disclosure … under sections 910
    through 917" — all six tables — so the Itemization accompanies whichever
    disclosure was given rather than belonging to one transaction type. It is
    the only spec in the library that comes back for every one.
  */
  it.each(MCA_TRANSACTION_TYPES)('the Itemization accompanies a %s transaction too', (transaction) => {
    expect(prescribedFormsForTransaction('US-CA', transaction).map((f) => f.slug)).toContain('ca-itemization');
  });

  it('both axes apply at once: no California spec reaches a New York transaction', () => {
    for (const transaction of MCA_TRANSACTION_TYPES) {
      expect(prescribedFormsForTransaction('US-NY', transaction).every((f) => f.jurisdiction === 'US-NY')).toBe(true);
    }
  });
});

/*
  INVARIANT 4, restated for the new axis. "Lombard-specific" is not a
  jurisdiction, and it is not a transaction type either. Every value below is a
  category the regulation itself names — sales-based financing, lease financing
  — or an honest statement that the statute has not been read. None of them is a
  product, a tenant or a template.
*/
describe('the transaction axis is a property of the law, not of the customer', () => {
  it.each(MCA_TRANSACTION_TYPES)('%s names a transaction, not a product or a tenant', (transaction) => {
    expect(transaction).not.toMatch(/lombard|circular|pacta|template/i);
  });

  it('every prescribed form and itemization declares one', () => {
    for (const spec of [...PRESCRIBED_FORMS, ...ITEMIZATIONS]) {
      expect(MCA_TRANSACTION_TYPES).toContain(spec.transaction);
    }
  });

  /*
    The narrow filter must never become the wide one by accident.
    `disclosuresFor` is still the answer to "what does this state prescribe",
    which is what the read-only conformity surface needs, and it is deliberately
    NOT transaction-aware. Both are needed and they answer different questions;
    this asserts they have not silently converged.
  */
  it.each(MCA_JURISDICTIONS)('disclosuresFor(%s) stays the wider answer', (jurisdiction) => {
    const wide = disclosuresFor(jurisdiction).map((d) => d.slug);
    const narrow = prescribedFormsForTransaction(jurisdiction, 'sales-based-financing').map((f) => f.slug);

    expect(narrow.every((slug) => wide.includes(slug))).toBe(true);
    expect(wide.length).toBeGreaterThanOrEqual(narrow.length);
  });
});
