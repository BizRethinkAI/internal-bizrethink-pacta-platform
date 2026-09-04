import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

const body = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug)?.body ?? '';

/*
  §83.535 — A LEASE MAY NOT BAN A WATERBED.

  Read off the statute on 3 September 2026:
  https://www.flsenate.gov/Laws/Statutes/2025/0083.535

    "No landlord may prohibit a tenant from using a flotation bedding system in
     a dwelling unit, provided the flotation bedding system does not violate
     applicable building codes. The tenant shall be required to carry in the
     tenant's name flotation insurance ... In any case, the policy shall carry
     a loss payable clause to the owner of the building."

  House rule 4 said "No water-filled furniture may be kept at the Premises."
  Void under §83.47(1)(a), and §83.47(2) exposes the landlord to the tenant's
  actual damages for including it.

  This is the class of defect an adversarial review of our own clauses cannot
  find. The rule was well drafted. Its defect was that it existed at all, and
  only walking the statute surfaced it.

  Note which way the statute runs: the tenant's insurance duty and the loss-
  payable clause arise BY STATUTE, not by drafting. Banning the bed forfeited
  a protection rather than creating one.
*/
describe('a lease may not prohibit what the statute permits', () => {
  const rules = () => body('rules.house-rules');

  it('does not ban water-filled furniture', () => {
    expect(rules()).not.toMatch(/water-filled furniture/i);
    expect(rules()).not.toMatch(/no waterbed/i);
  });

  it('recites the insurance the statute attaches to a flotation bed', () => {
    expect(rules()).toMatch(/flotation/i);
    expect(rules()).toMatch(/loss payable/i);
  });

  it('keeps the ban conditional on the building code, as the statute does', () => {
    expect(rules()).toMatch(/building code/i);
  });
});

/*
  §83.505 — TWO MIRRORED ELECTIONS, NOT AN ASSUMPTION.

  Read off the statute on 3 September 2026:
  https://www.flsenate.gov/Laws/Statutes/2025/0083.505

  The prescribed addendum carries a LANDLORD election and a TENANT election,
  each with two checkboxes — agree, and do not agree — each with a designated
  address and its own revocation sentence.

  Ours asserted both parties had elected: "Landlord elects to receive notices
  by email at: X". A tenant who did not want e-mail had no way to say so, and
  a party who never chose was recorded as having chosen.

  This is the THIRD clause found with one option where the statute prescribes
  two — after §83.595(4) and before whatever is next. The pattern is ours, not
  Florida's: when a statute offers a choice we have tended to render the branch
  we expected rather than the choice.

  "Substantially the following form" gives the wording room. It does not make
  a form with half the options substantially the same form.
*/
describe('the electronic-notice addendum records two real elections', () => {
  const addendum = () => body('notices.electronic-delivery');

  it('gives each party both options', () => {
    // Two parties, two boxes each.
    expect((addendum().match(/\[ \]/g) ?? []).length).toBe(4);
  });

  it('lets either party decline', () => {
    expect((addendum().match(/I do not agree to receive notices by e-mail/gi) ?? []).length).toBe(2);
  });

  it('names both elections separately', () => {
    expect(addendum()).toMatch(/Landlord election/i);
    expect(addendum()).toMatch(/Tenant election/i);
  });

  it('keeps a designated address for each', () => {
    expect(addendum()).toMatch(/\{\{landlordNoticeEmails\}\}/);
    expect(addendum()).toMatch(/\{\{tenantNoticeEmails\}\}/);
  });

  it('states the election is voluntary and revocable, which §83.505(1) requires conspicuously', () => {
    expect(addendum()).toMatch(/voluntar/i);
    expect(addendum()).toMatch(/revoke/i);
  });

  it('carries the delivery and record-keeping rules from (4) and (5)', () => {
    expect(addendum()).toMatch(/returned to the sender as undeliverable|returned as undeliverable/i);
    expect(addendum()).toMatch(/evidence of (its )?transmission/i);
  });
});
