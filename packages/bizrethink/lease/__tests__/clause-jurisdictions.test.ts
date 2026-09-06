import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

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
};

describe('the library knows whose law each clause is', () => {
  it('classifies every clause, and only the clauses that exist', () => {
    const actual = Object.fromEntries(FL_LIBRARY.map((c) => [c.slug, c.jurisdiction]));

    expect(actual).toEqual(PINNED);
  });

  /*
    The boundary rule from the HOA work, one level up. If a clause names a
    single state's statute it is that state's clause, whatever the label says.
  */
  it('has no generic clause citing one state law', () => {
    const offenders = FL_LIBRARY.filter(
      (c) =>
        c.jurisdiction === 'generic' &&
        (/Fla\. Stat\.|Florida Statutes|N\.C\. Gen\. Stat\.|NCGS/.test(c.body) ||
          /Fla\.|N\.C\./.test(c.requiredBy ?? '')),
    ).map((c) => c.slug);

    expect(offenders).toEqual([]);
  });

  it('has every Florida clause that claims a statute claiming a Florida one', () => {
    const offenders = FL_LIBRARY.filter(
      (c) => c.jurisdiction === 'US-FL' && c.requiredBy !== undefined && !/Fla\.|Ch\. \d+, Fla/.test(c.requiredBy),
    ).map((c) => `${c.slug} → ${c.requiredBy}`);

    expect(offenders).toEqual([]);
  });

  it('has every federal clause citing federal law', () => {
    for (const clause of FL_LIBRARY.filter((c) => c.jurisdiction === 'US')) {
      expect(`${clause.body} ${clause.requiredBy ?? ''}`, clause.slug).toMatch(/U\.S\.C\.|C\.F\.R\./);
    }
  });

  /*
    The count is the argument for doing this at all, so it is asserted rather
    than described. Thirty-five clauses that do not have to be rewritten for
    North Carolina.
  */
  it('leaves most of the library portable', () => {
    const by = (j: string) => FL_LIBRARY.filter((c) => c.jurisdiction === j).length;

    expect({ generic: by('generic'), US: by('US'), 'US-FL': by('US-FL') }).toEqual({
      generic: 35,
      US: 1,
      'US-FL': 27,
    });
  });
});
