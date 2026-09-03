import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

const clause = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug);
const body = (slug: string) => clause(slug)?.body ?? '';

/*
  THE FEDERAL LEAD DISCLOSURE IS SIX THINGS, AND WE SHIPPED ONE.

  40 C.F.R. §745.113(b) and 24 C.F.R. §35.92(b), read on 3 September 2026:
  https://www.law.cornell.edu/cfr/text/40/745.113

    "Each contract to lease target housing shall include, as an attachment or
     within the contract, the following elements..."

  Six elements: the Lead Warning Statement, the lessor's disclosure of KNOWN
  paint and hazards, a list of records provided, the lessee's acknowledgment of
  the pamphlet, an agent statement, and signatures. We had the first.

  42 U.S.C. §4852d(b)(3) provides TREBLE damages, so an incomplete disclosure is
  not a lesser version of a complete one.

  Not triggered by a 2018 build. Live for every pre-1978 property, and the clause
  fails safe to INCLUDE when the year is unknown — which makes completeness the
  difference between a safe default and a treble-damages default.

  EPA AND HUD NO LONGER AGREE. EPA added "known" to the Warning Statement in
  November 2024 (89 FR 89458); HUD's §35.92(b)(1) still carries its 1999 source
  note without it. We use EPA's: it is later, it tracks §4852d(a)(1)(B)'s "any
  known lead-based paint", and being narrower it satisfies HUD's substance too.
  Flagged for counsel rather than decided here.
*/
describe('the lead disclosure carries all six federal elements', () => {
  const lead = () => body('disclosure.lead-paint');

  it("1 — the Lead Warning Statement, in EPA's post-2024 wording", () => {
    expect(lead()).toContain('LEAD WARNING STATEMENT');
    // "known" is the word EPA added and HUD has not.
    expect(lead()).toMatch(/lessors must disclose the presence of known lead-based paint/);
  });

  it('2 — the lessor discloses known paint, or states there is none known', () => {
    expect(lead()).toMatch(/\[ \][^\n]*known lead-based paint/i);
    expect(lead()).toMatch(/no knowledge of/i);
  });

  it('3 — a list of records provided, or a statement that none exist', () => {
    expect(lead()).toMatch(/records (and|or) reports/i);
    expect(lead()).toMatch(/no records/i);
  });

  it('4 — the lessee acknowledges the information and the pamphlet', () => {
    expect(lead()).toMatch(/pamphlet/i);
    expect(lead()).toMatch(/Protect Your Family/i);
  });

  it('5 — the agent statement, for when an agent is involved', () => {
    expect(lead()).toMatch(/agent has informed the lessor/i);
  });

  it('6 — signatures certifying accuracy, with dates', () => {
    expect(lead()).toMatch(/certif/i);
    expect(lead()).toMatch(/signature|sign/i);
  });

  it('still fails safe: included when the build year is unknown', () => {
    expect(clause('disclosure.lead-paint')?.includeWhen?.({ propertyYearBuilt: null } as never)).toBe(true);
    expect(clause('disclosure.lead-paint')?.includeWhen?.({ propertyYearBuilt: 1977 } as never)).toBe(true);
    expect(clause('disclosure.lead-paint')?.includeWhen?.({ propertyYearBuilt: 2018 } as never)).toBe(false);
  });
});

/*
  §83.67(5) — A REMEDY WE WERE NOT TAKING.

  Read off the statute on 3 September 2026:
  https://www.flsenate.gov/Laws/Statutes/2025/0083.67

  If the rental agreement says so, the landlord is relieved of the §715.104 duty
  to store and dispose of personal property a tenant leaves behind. The relief is
  available ONLY where the lease carries a prescribed legend, "printed or clearly
  stamped".

  §83.67 appeared nowhere in the library. Without it the landlord owes the full
  statutory storage-and-disposition process on anything left behind — a real
  operational burden that the statute offers to remove for the price of one
  paragraph.

  This is the shape the statutory walk exists to find: not a clause that is
  wrong, but a clause that is absent, and whose absence costs something.
*/
describe('§83.67(5) storage relief', () => {
  const storage = () => body('moveout.personal-property');

  it('exists', () => {
    expect(clause('moveout.personal-property')).toBeDefined();
  });

  it('cites the subsection that grants the relief', () => {
    expect(clause('moveout.personal-property')?.requiredBy).toMatch(/83\.67\(5\)/);
  });

  it('carries the prescribed legend', () => {
    expect(storage()).toContain(
      'BY SIGNING THIS RENTAL AGREEMENT, THE TENANT AGREES THAT UPON SURRENDER, ABANDONMENT, OR RECOVERY OF POSSESSION OF THE DWELLING UNIT DUE TO THE DEATH OF THE LAST REMAINING TENANT, AS PROVIDED BY CHAPTER 83, FLORIDA STATUTES, THE LANDLORD SHALL NOT BE LIABLE OR RESPONSIBLE FOR STORAGE OR DISPOSITION OF THE TENANT’S PERSONAL PROPERTY.',
    );
  });

  it('names the duty it displaces, so the effect is readable', () => {
    expect(storage()).toMatch(/715\.104/);
  });
});
