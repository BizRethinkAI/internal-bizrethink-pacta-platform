import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';
import { FL_COMPELLED, whyThisClause } from '../clauses/why-this-clause';

/*
  WHY IS THIS CLAUSE HERE AT ALL?

  The question a reviewer needs answered first, and the one the library page
  could not answer. It showed `parties.recital · v2 · parties · Unapproved` —
  true, and useless.

  There are three honest answers, and the difference between them is where a
  reviewer should spend their hour:

    COMPELLED     a statute requires this to appear in a lease. Verifiable
                  against the statute book; a reviewer checks the text.
    IMPLEMENTS    drafted to give effect to a statute that regulates conduct
                  or offers a remedy. The statute did not demand these words.
    DISCRETIONARY nothing requires it. Ours. This is the editorial judgment a
                  lawyer is actually for.

  The COMPELLED list is the output of a statutory walk on 2026-09-03 that read
  Ch. 83 Part II end to end, plus the adjacent Florida chapters and the federal
  set, and asked of each section whether it requires text in a lease. It is
  deliberately SHORT. Most of a lease is not statute.
*/
describe('every clause can say why it exists', () => {
  it('classifies all of them', () => {
    for (const clause of FL_LIBRARY) {
      expect(whyThisClause(clause).kind).toMatch(/^(compelled|implements|discretionary)$/);
    }
  });

  it('names the statute for anything compelled', () => {
    for (const clause of FL_LIBRARY) {
      const why = whyThisClause(clause);

      if (why.kind === 'compelled') {
        expect(why.citation).toBeTruthy();
      }
    }
  });

  it('is honest that most of the library is our drafting', () => {
    const discretionary = FL_LIBRARY.filter((c) => whyThisClause(c).kind === 'discretionary');

    // If this ever drops to a handful, someone has quietly reclassified
    // drafting as law. That is the failure this number guards.
    expect(discretionary.length).toBeGreaterThan(30);
  });
});

/*
  The compelled set is the walk's output. Changing it is a claim about Florida
  law, so it is pinned: adding an entry without a walk should fail here first.
*/
describe('what Florida and the federal government actually compel', () => {
  it('is exactly what the walk found', () => {
    expect(FL_COMPELLED.map((c) => c.slug).sort()).toEqual(
      [
        'deposit.escrow-notice',
        'deposit.statutory-notice',
        'disclosure.flood',
        'disclosure.landlord-identity',
        'disclosure.lead-paint',
        'disclosure.radon',
      ].sort(),
    );
  });

  it('cites a subsection, not just a section, where the statute is specific', () => {
    const deposit = FL_COMPELLED.find((c) => c.slug === 'deposit.statutory-notice');

    // §83.49(3) is the claim notice. The all-caps disclosure is (2)(d).
    expect(deposit?.citation).toBe('Fla. Stat. §83.49(2)(d)');
  });

  it('records the exemption that decides whether a landlord owes it', () => {
    const deposit = FL_COMPELLED.find((c) => c.slug === 'deposit.statutory-notice');

    // §83.49(2) does not apply to a landlord renting fewer than five units.
    expect(deposit?.appliesWhen).toMatch(/five/i);
  });

  it('does not claim Chapter 515 or 720 compel anything', () => {
    // Both are sales/construction only. Asserting the absence, because both
    // were wrongly reported as compliance obligations before the walk.
    const cites = FL_COMPELLED.map((c) => c.citation).join(' ');

    expect(cites).not.toMatch(/515/);
    expect(cites).not.toMatch(/720/);
  });
});
