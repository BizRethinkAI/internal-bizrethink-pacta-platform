import { describe, expect, it } from 'vitest';

import { ALL_CLAUSES } from '../clauses/library';

/**
 * Which jurisdiction's law each clause depends on.
 *
 * THE MAP IS PINNED, NOT PATTERNED, for the reason `library-invariants` is:
 * a pattern can be widened by whoever it inconveniences, and one already was.
 * Adding a clause forces an edit here, which forces someone to answer the only
 * question that matters — **would this text still be true in another state?**
 *
 *   `generic`  no jurisdiction's law is involved. Written once, used by every
 *              state. A generic clause may not cite one state's statute.
 *   `US`       federal law. Applies everywhere.
 *   `US-FL`    depends on Florida law and does not travel.
 *   `US-NC`    depends on North Carolina law and does not travel.
 *
 * Sixty-three clauses were labelled `US-FL` when only twenty-seven of them
 * actually depend on Florida. Adding North Carolina under that labelling would
 * have duplicated thirty-five clauses per state — a second `general.severability`,
 * a second set of house rules — and each would have needed approving separately,
 * by an attorney in each state, for text that turns on no state's law.
 */

const PINNED: Record<string, string> = {
  'parties.recital': 'generic',
  'premises.description': 'generic',
  'term.fixed': 'generic',
  'term.non-renewal-notice': 'US-FL',
  'term.holdover': 'generic',
  'term.termination-on-sale': 'generic',
  'rent.base': 'generic',
  'rent.proration': 'generic',
  'rent.late-fee-flat': 'generic',
  'rent.late-fee-tiered': 'generic',
  'rent.returned-payment': 'generic',
  'deposit.held': 'US-FL',
  'deposit.held-carried': 'US-FL',
  'deposit.advance-rent': 'US-FL',
  'deposit.advance-rent-carried': 'US-FL',
  'deposit.return': 'US-FL',
  'hoa.compliance': 'generic',
  // Ch. 190 Fla. Stat. — a Florida creature. A second state gets its own
  // clause rather than a widened version of this one.
  'cdd.assessments': 'US-FL',
  'hoa.lease-requirements': 'generic',
  'hoa.amenity-access': 'generic',
  'hoa.governing-documents-receipt': 'generic',
  'condition.report-receipt': 'generic',
  'hoa.cure': 'US-FL',
  'maintenance.landlord-statutory': 'US-FL',
  'maintenance.shift-single-family': 'US-FL',
  'maintenance.storm': 'US-FL',
  'maintenance.detectors': 'US-FL',
  'maintenance.tenant-repair-threshold': 'US-FL',
  'maintenance.hvac-filters': 'generic',
  'maintenance.pool-split': 'generic',
  'maintenance.pool-safety': 'US-FL',
  'maintenance.lawn-split': 'generic',
  'fees.administrative': 'generic',
  'pets.addendum-fees': 'generic',
  'pets.addendum': 'generic',
  'use.residential-only': 'generic',
  'use.occupancy-limit': 'generic',
  'use.occupancy-limit-with-others': 'generic',
  'use.no-alterations': 'generic',
  'use.no-assignment': 'generic',
  'utilities.allocation': 'generic',
  'insurance.renters': 'generic',
  'access.entry': 'US-FL',
  'access.annual-inspection': 'US-FL',
  'default.statutory-notices': 'US-FL',
  'moveout.condition': 'generic',
  'moveout.personal-property': 'US-FL',
  'mould.control': 'generic',
  'termination.early-election': 'US-FL',
  'rules.house-rules': 'generic',
  'notices.method': 'US-FL',
  'notices.tenant-address': 'generic',
  'notices.electronic-delivery': 'US-FL',
  'general.entire-agreement': 'generic',
  'general.severability': 'generic',
  'general.waiver': 'US-FL',
  'general.governing-law': 'US-FL',
  'general.execution': 'generic',
  'disclosure.radon': 'US-FL',
  'disclosure.flood': 'US-FL',
  'deposit.statutory-notice': 'US-FL',
  'deposit.escrow-notice': 'US-FL',
  'disclosure.landlord-identity': 'US-FL',
  'disclosure.lead-paint': 'US',

  /*
    NORTH CAROLINA, added 2026-09-06. Seventeen clauses against Florida's
    twenty-eight, and not one of the thirty-five generic clauses duplicated —
    which is the whole argument for having done the reclassification first.

    Every slug ends in `-nc` because approvals are keyed by slug alone (see
    `loadClauseApprovals`), so a shared name would let one state's sign-off hide
    the other's. Florida's are unsuffixed for historical reasons only.
  */
  'deposit.held-nc': 'US-NC',
  'deposit.held-carried-nc': 'US-NC',
  'deposit.escrow-notice-nc': 'US-NC',
  'deposit.advance-rent-nc': 'US-NC',
  'deposit.advance-rent-carried-nc': 'US-NC',
  'deposit.accounting-nc': 'US-NC',
  'rent.late-fee-nc': 'US-NC',
  'fees.litigation-nc': 'US-NC',
  'maintenance.landlord-statutory-nc': 'US-NC',
  'maintenance.detectors-nc': 'US-NC',
  'access.entry-nc': 'US-NC',
  'default.notices-nc': 'US-NC',
  'moveout.personal-property-nc': 'US-NC',
  'notices.method-nc': 'US-NC',
  'notices.landlord-address-nc': 'US-NC',
  'general.waiver-nc': 'US-NC',
  'general.governing-law-nc': 'US-NC',
};

describe('the library knows whose law each clause is', () => {
  it('classifies every clause, and only the clauses that exist', () => {
    const actual = Object.fromEntries(ALL_CLAUSES.map((c) => [c.slug, c.jurisdiction]));

    expect(actual).toEqual(PINNED);
  });

  /*
    The boundary rule from the HOA work, one level up. If a clause names a
    single state's statute it is that state's clause, whatever the label says.
  */
  it('has no generic clause citing one state law', () => {
    const offenders = ALL_CLAUSES.filter(
      (c) =>
        c.jurisdiction === 'generic' &&
        (/Fla\. Stat\.|Florida Statutes|N\.C\. Gen\. Stat\.|NCGS/.test(c.body) ||
          /Fla\.|N\.C\./.test(c.requiredBy ?? '')),
    ).map((c) => c.slug);

    expect(offenders).toEqual([]);
  });

  it('has every Florida clause that claims a statute claiming a Florida one', () => {
    const offenders = ALL_CLAUSES.filter(
      (c) => c.jurisdiction === 'US-FL' && c.requiredBy !== undefined && !/Fla\.|Ch\. \d+, Fla/.test(c.requiredBy),
    ).map((c) => `${c.slug} → ${c.requiredBy}`);

    expect(offenders).toEqual([]);
  });

  /*
    The same tooth, pointed at the second state. A North Carolina clause citing
    a Florida statute is the failure mode a port produces, and the one a
    reviewer would be least likely to notice — the citation looks like a
    citation.
  */
  it('has every North Carolina clause that claims a statute claiming a North Carolina one', () => {
    const offenders = ALL_CLAUSES.filter(
      (c) => c.jurisdiction === 'US-NC' && c.requiredBy !== undefined && !/N\.C\. Gen\. Stat\./.test(c.requiredBy),
    ).map((c) => `${c.slug} → ${c.requiredBy}`);

    expect(offenders).toEqual([]);
  });

  /*
    And in the body, where a citation does not have to be declared to be read by
    a signer. Neither state may name the other's statute book at all.
  */
  it('never names one state law inside another state clause', () => {
    const offenders = ALL_CLAUSES.filter(
      (c) =>
        (c.jurisdiction === 'US-NC' && /Fla\. Stat\.|Florida/.test(c.body)) ||
        (c.jurisdiction === 'US-FL' && /N\.C\. Gen\. Stat\.|North Carolina/.test(c.body)),
    ).map((c) => c.slug);

    expect(offenders).toEqual([]);
  });

  it('has every federal clause citing federal law', () => {
    for (const clause of ALL_CLAUSES.filter((c) => c.jurisdiction === 'US')) {
      expect(`${clause.body} ${clause.requiredBy ?? ''}`, clause.slug).toMatch(/U\.S\.C\.|C\.F\.R\./);
    }
  });

  /*
    The count is the argument for doing this at all, so it is asserted rather
    than described. Thirty-five clauses that do not have to be rewritten for
    North Carolina.
  */
  it('leaves most of the library portable', () => {
    const by = (j: string) => ALL_CLAUSES.filter((c) => c.jurisdiction === j).length;

    expect({
      generic: by('generic'),
      US: by('US'),
      'US-FL': by('US-FL'),
      'US-NC': by('US-NC'),
    }).toEqual({
      generic: 35,
      US: 1,
      'US-FL': 28,
      'US-NC': 17,
    });
  });

  /*
    THE NUMBER THAT ANSWERS "WAS A SECOND STATE CHEAP".

    Adding North Carolina cost 17 new clauses and duplicated 0 of the 36
    portable ones. Under the old labelling — every clause marked `US-FL` — it
    would have cost 53, because all 36 would have needed a second copy, a second
    approval, and a second attorney in a second state to read text that turns on
    no state's law.
  */
  it('cost a second state seventeen clauses rather than fifty-three', () => {
    const nc = ALL_CLAUSES.filter((c) => c.jurisdiction === 'US-NC');
    const portable = ALL_CLAUSES.filter((c) => c.jurisdiction === 'generic' || c.jurisdiction === 'US');

    expect(nc.length).toBe(17);
    expect(portable.length).toBe(36);

    // Nothing portable was forked to serve North Carolina.
    const forked = portable.filter((c) => c.slug.endsWith('-nc'));

    expect(forked).toEqual([]);
  });
});
