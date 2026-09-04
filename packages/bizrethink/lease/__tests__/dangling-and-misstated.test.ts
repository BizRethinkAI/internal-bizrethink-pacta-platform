import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

const body = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug)?.body ?? '';

/*
  A CROSS-REFERENCE THAT OUTLIVED WHAT IT POINTED AT.

  Deleting the $75 inspection-refusal fee was right — a flat charge for
  DECLINING entry contemplates no loss, which is a penalty rather than
  liquidated damages, and §83.56(2) already supplies the remedy.

  But the access clause still said "the charge set out in the administrative
  charges section applies", and that section now contains only the documented
  cost of replacing keys. The lease threatened a charge that existed nowhere in
  the document.

  Two independent adversarial reviews found this within a day of each other.
  Neither was reading the diff — they were reading the rendered lease, which is
  the only place a dangling reference is visible. Deleting a clause is not done
  until you have grepped for what points at it.
*/
describe('nothing points at a charge that does not exist', () => {
  it('the access clause names no phantom charge', () => {
    expect(body('access.annual-inspection')).not.toMatch(/administrative charges section/i);
  });

  it('it names the statutory remedy instead, which is the real one', () => {
    // §83.56(2): seven days to cure a noncompliance. That is what a landlord
    // actually has when a tenant unreasonably refuses arranged access.
    expect(body('access.annual-inspection')).toMatch(/§83\.56\(2\)/);
  });

  it('no clause refers to a section by a name the document does not use', () => {
    // "the administrative charges section" was never a section heading either;
    // the charges live under Maintenance and Repair.
    for (const clause of FL_LIBRARY) {
      expect(clause.body).not.toMatch(/administrative charges section/i);
    }
  });
});

/*
  A CLAUSE THAT MISSTATED THE STATUTE IT CITED.

  Ours said the §83.51(1) obligations "may not be waived". §83.51(1) ends:

    "The landlord's obligations under this subsection may be altered or
     modified in writing with respect to a single-family home or duplex."

  Read on 2026-09-04: https://www.flsenate.gov/Laws/Statutes/2025/0083.51

  The error favoured the tenant, so it was not dangerous — but a lease that
  misdescribes the statute it cites invites an argument about what else it got
  wrong, and this library is about to be read by a lawyer.

  The clause still does not USE the carve-out. Saying the duties stand is a
  choice; saying they cannot be altered is a mistake.
*/
describe('the maintenance clause describes §83.51(1) correctly', () => {
  const maintenance = () => body('maintenance.landlord-statutory');

  it('no longer claims the duties may not be waived', () => {
    expect(maintenance()).not.toMatch(/may not be waived/i);
  });

  it('records that Landlord is not using the single-family carve-out', () => {
    expect(maintenance()).toMatch(/single-family home or duplex/i);
    expect(maintenance()).toMatch(/does not alter|not altered/i);
  });

  it('still states the obligations themselves', () => {
    expect(maintenance()).toMatch(/building, housing and health codes/i);
    expect(maintenance()).toMatch(/plumbing in reasonable working condition/i);
  });
});
