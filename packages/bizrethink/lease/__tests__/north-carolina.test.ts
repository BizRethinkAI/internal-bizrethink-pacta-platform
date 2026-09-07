import { describe, expect, it } from 'vitest';

import { libraryFor } from '../clauses/library';
import type { Clause } from '../clauses/types';
import { NC_LIBRARY } from '../clauses/us-nc';
import { whyThisClause } from '../clauses/why-this-clause';

/**
 * North Carolina, the second state.
 *
 * The point of the whole jurisdiction split was that a second state should be
 * the clauses North Carolina law actually requires, plus the 36 portable ones,
 * and NOT a second copy of Florida. So the first thing asserted here is what is
 * ABSENT: North Carolina gets no early-termination election, no radon
 * disclosure, no flood disclosure, no maintenance shift, no repair threshold —
 * because each of those exists only because a Florida statute makes it exist.
 *
 * Every citation below was read off ncleg.gov on 2026-09-06. The URL pattern is
 * https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-NN.html
 * and the section text is public domain. Where a figure appears in a clause it
 * is the statute's own — nothing here is a drafting choice dressed as law.
 */

const clause = (slug: string): Clause => {
  const found = NC_LIBRARY.find((candidate) => candidate.slug === slug);

  if (!found) {
    throw new Error(`no such North Carolina clause: ${slug}`);
  }

  return found;
};

const florida = (slug: string): Clause => {
  const found = libraryFor('US-FL').find((candidate) => candidate.slug === slug);

  if (!found) {
    throw new Error(`no such Florida clause: ${slug}`);
  }

  return found;
};

// ── What North Carolina does NOT get ───────────────────────────────────────

describe('North Carolina is not a copy of Florida', () => {
  /*
    The whole argument for splitting the library, asserted as a number. Adding
    NC under the old labelling would have duplicated the 35 generic clauses per
    state; it duplicates none of them.
  */
  it('inherits every portable clause without copying one', () => {
    const nc = libraryFor('US-NC');
    const portable = nc.filter((c) => c.jurisdiction === 'generic' || c.jurisdiction === 'US');

    expect(portable.length).toBe(36);
    expect(NC_LIBRARY.every((c) => c.jurisdiction === 'US-NC')).toBe(true);
  });

  /*
    Each of these exists in the Florida library only because a Florida statute
    makes it exist, and North Carolina has no analogue. A North Carolina lease
    is SILENT on them, which is the correct outcome — a state that does not
    regulate a thing does not get a clause about it.

    `maintenance.shift-single-family` and `maintenance.tenant-repair-threshold`
    are the two worth reading twice. Fla. Stat. §83.51(2) lets a lease shift
    certain duties on a single-family home or duplex. N.C. Gen. Stat. §42-42(b)
    permits that only by a SUBSEQUENT written contract supported by
    consideration other than the letting of the premises — so the shift cannot
    live in the lease at all, and North Carolina gets no shift clause and no
    repair threshold.
  */
  it('gets no Florida clause that a Florida statute is the only reason for', () => {
    const ncSlugs = libraryFor('US-NC').map((c) => c.slug);

    for (const slug of [
      'termination.early-election', // §83.595(4) — a Florida election
      'disclosure.radon', // §404.056(5)
      'disclosure.flood', // §83.512
      'maintenance.shift-single-family', // §83.51(2); §42-42(b) runs the other way
      'maintenance.tenant-repair-threshold', // same
      'maintenance.storm', // built on the §83.51(2) allocation
      'maintenance.pool-safety', // Ch. 515, Fla. Stat.
      'cdd.assessments', // Ch. 190 — a Florida creature
      'term.non-renewal-notice', // §83.575
      'notices.electronic-delivery', // §83.505 addendum
      'access.annual-inspection', // framed on the §83.56(2) cure
      'hoa.cure', // §720.305(1)
      'deposit.statutory-notice', // §83.49(2)(d)
    ]) {
      expect(ncSlugs, slug).not.toContain(slug);
    }
  });

  /*
    NORTH CAROLINA COMPELS NO LEASE TEXT AT ALL. Nothing in Chapter 42 says a
    residential lease "shall contain" anything; §42-50's notice is a separate
    written notice given within 30 days of the term beginning, and the §42-46
    fees are permissive — available only "pursuant to a written lease", which
    makes them a remedy a lease may reserve rather than text it must carry.

    So the only compelled clause in a North Carolina lease is the FEDERAL lead
    disclosure, and that reaches it through the portable tier. This is asserted
    rather than described because `whyThisClause` labels every row on the
    counsel page, and a state whose compelled count is one is a fact a reviewer
    should be shown, not a gap they should wonder about.
  */
  it('has no clause compelled by North Carolina law, because there are none', () => {
    expect(NC_LIBRARY.filter((c) => whyThisClause(c).kind === 'compelled')).toEqual([]);

    const compelled = libraryFor('US-NC')
      .filter((c) => whyThisClause(c).kind === 'compelled')
      .map((c) => c.slug);

    expect(compelled).toEqual(['disclosure.lead-paint']);
  });
});

// ── Provenance: nothing here has been read by anybody ──────────────────────

describe('the North Carolina set is honestly unreviewed', () => {
  it('is drafted, unattributed and undraftable to a third party', () => {
    for (const entry of NC_LIBRARY) {
      expect(entry.status, entry.slug).toBe('draft');
      expect(entry.source.kind, entry.slug).toBe('attorney-drafted');

      if (entry.source.kind === 'attorney-drafted') {
        expect(entry.source.author, entry.slug).toBeNull();
      }
    }
  });

  /*
    Slugs are globally unique and the North Carolina ones say so in their names.

    NOT COSMETIC. `loadClauseApprovals` keys approvals by slug alone and keeps
    only the newest row per slug, so a Florida `deposit.return` and a North
    Carolina `deposit.return` sharing a slug would let one state's approval hide
    the other's — the second clause would read as unapproved forever, with
    nothing red. `library-invariants` already requires uniqueness; this pins the
    convention that keeps it true as states are added.
  */
  it('names every North Carolina clause for the state it belongs to', () => {
    for (const entry of NC_LIBRARY) {
      expect(entry.slug, entry.slug).toMatch(/-nc$/);
    }
  });

  it('cites North Carolina or nothing, never another state', () => {
    for (const entry of NC_LIBRARY) {
      expect(`${entry.body} ${entry.requiredBy ?? ''}`, entry.slug).not.toMatch(/Fla\. Stat\.|Florida/);
    }
  });
});

// ── The divergence guard ───────────────────────────────────────────────────

/**
 * WHERE TWO STATES SAY NEARLY THE SAME THING FOR DIFFERENT REASONS.
 *
 * Six pairs below read as near-duplicates and are not. The instinct on meeting
 * them is to collapse each pair into one parameterised clause — thirty days is
 * thirty days, a deposit is a deposit — and every one of those merges would be
 * wrong, because the words that differ are the words the statutes differ on.
 *
 * A comment saying "do not merge these" is not a guard. This is. Each pair
 * asserts that the two texts are DIFFERENT and that each contains its own
 * state's distinguishing phrase, so a merge fails loudly at the point it is
 * attempted rather than quietly at the point a lease is signed.
 *
 * The pattern is borrowed from the MCA vertical, where 10 CCR §914 and
 * 23 NYCRR §600.6 prescribe an APR sentence identical but for two words and
 * both are correct.
 */
describe('near-identical clauses that must never be merged', () => {
  const pairs: {
    what: string;
    fl: string;
    nc: string;
    flPhrase: RegExp;
    ncPhrase: RegExp;
  }[] = [
    {
      /*
        Thirty days in both, running from DIFFERENT EVENTS. Fla. Stat. §83.49(2)
        runs from the landlord RECEIVING the money; N.C. Gen. Stat. §42-50 runs
        from THE BEGINNING OF THE LEASE TERM. On a lease signed six weeks before
        move-in those are six weeks apart, and merging them would pick one.
      */
      what: 'when the tenant must be told where the deposit is held',
      fl: 'deposit.escrow-notice',
      nc: 'deposit.escrow-notice-nc',
      flPhrase: /within 30 days of receiving the security deposit or advance rent/i,
      ncPhrase: /within 30 days after the beginning of the lease term/i,
    },
    {
      /*
        Both are "the deposit comes back". Florida: 15 days with no claim, 30 to
        notice one, running from the tenant VACATING (§83.49(3)(a)). North
        Carolina: 30 days to itemise, and where the extent cannot be determined
        an interim accounting at 30 and a final at 60 — running from termination
        of the tenancy AND delivery of possession (§42-52). Different numbers,
        different clock, and North Carolina has a two-stage accounting Florida
        does not have at all.
      */
      what: 'the deadline for returning the deposit',
      fl: 'deposit.return',
      nc: 'deposit.accounting-nc',
      flPhrase: /\{\{depositReturnDays\}\} days after Tenant vacates/,
      ncPhrase: /interim accounting within 30 days and a final accounting within 60 days/i,
    },
    {
      /*
        Fla. Stat. §83.51(2) EXPRESSLY PERMITS the lease to alter the landlord's
        duties on a single-family home or duplex, which is why the Florida
        clause says "Landlord does not alter them". N.C. Gen. Stat. §42-42(b)
        permits alteration only by a subsequent written contract supported by
        consideration other than the letting — so the North Carolina clause
        cannot offer the option, and its repair duty is additionally conditioned
        on the tenant giving WRITTEN notice, which Florida does not require.
      */
      what: "the landlord's repair duty",
      fl: 'maintenance.landlord-statutory',
      nc: 'maintenance.landlord-statutory-nc',
      flPhrase: /permits them to be altered or modified in writing for a single-family home or duplex/i,
      ncPhrase: /notifies Landlord of the needed repair in writing/i,
    },
    {
      /*
        Florida's alarm clause ends "Nothing in this section makes Tenant
        responsible for repairing or replacing a device itself". North Carolina
        runs the OTHER WAY: §42-44(a2) makes the tenant reimburse the cost of an
        alarm they disabled or damaged, and §42-42(a)(5)/(7) put a 15-day
        deadline on the landlord instead. Merging these would hand one state's
        tenant the other state's bill.
      */
      what: 'smoke and carbon monoxide alarms',
      fl: 'maintenance.detectors',
      nc: 'maintenance.detectors-nc',
      flPhrase: /Nothing in this section makes Tenant responsible for repairing or replacing a device itself/i,
      ncPhrase: /within 15 days of receiving that notice/i,
    },
    {
      /*
        Florida CLOSES the list of people a tenant must admit (§83.53(1)) and
        fixes the hours and the notice (§83.53(2)). North Carolina has no entry
        statute at all — verified as an absence, not assumed — so its clause
        carries no citation, no statutory hours, and says so by confining entry
        to the purposes the clause itself names.
      */
      what: "the landlord's right to enter",
      fl: 'access.entry',
      nc: 'access.entry-nc',
      flPhrase: /between \{\{entryEarliestLabel\}\} and \{\{entryLatestLabel\}\}/,
      ncPhrase: /Landlord shall not enter for any purpose not set out in this section/i,
    },
    {
      /*
        THE PAIR THAT POINTS IN OPPOSITE DIRECTIONS. Fla. Stat. §83.67(5) offers
        a landlord relief from the duty to store what a tenant leaves behind, in
        exchange for a prescribed legend — so the Florida clause TAKES a right.
        North Carolina makes distress and distraint contrary to public policy
        (§42-25.7) and prescribes the procedure itself (§42-25.9), so the North
        Carolina clause DISCLAIMS one. Nothing about them is mergeable.
      */
      what: 'personal property left behind',
      fl: 'moveout.personal-property',
      nc: 'moveout.personal-property-nc',
      flPhrase: /SHALL NOT BE LIABLE OR RESPONSIBLE FOR STORAGE OR DISPOSITION/,
      ncPhrase: /only as Article 2A of Chapter 42 of the General Statutes permits/i,
    },
    {
      /*
        Both are called "No Waiver" and only one of them is about rent. Florida
        must carve out §83.56(5), under which accepting rent with actual
        knowledge of a noncompliance WAIVES the right to act on it. North
        Carolina has no such rule, and §42-26(c) runs the other way — a lease
        MAY provide that accepting partial rent does not waive the breach. So
        North Carolina's waiver clause says nothing about rent, and the rent
        point lives in its default clause instead.
      */
      what: 'waiver',
      fl: 'general.waiver',
      nc: 'general.waiver-nc',
      flPhrase: /acceptance of rent does not waive a subsequent or continuing noncompliance/i,
      ncPhrase: /does not prevent that party from enforcing it later\.$/,
    },
  ];

  for (const pair of pairs) {
    describe(pair.what, () => {
      it('says two different things', () => {
        expect(clause(pair.nc).body).not.toBe(florida(pair.fl).body);
      });

      it("keeps each state's distinguishing words", () => {
        expect(florida(pair.fl).body, pair.fl).toMatch(pair.flPhrase);
        expect(clause(pair.nc).body, pair.nc).toMatch(pair.ncPhrase);
      });

      /*
        And neither may acquire the other's. This is the assertion that fires on
        a merge: a parameterised clause serving both states would have to
        contain both phrases, or neither.
      */
      it("carries neither state's phrase into the other", () => {
        expect(clause(pair.nc).body, pair.nc).not.toMatch(pair.flPhrase);
        expect(florida(pair.fl).body, pair.fl).not.toMatch(pair.ncPhrase);
      });
    });
  }

  /*
    The one place the two states genuinely AGREE on a rule, kept separate for a
    different reason: Florida's waiver clause carries §83.56(5) and North
    Carolina's must not, so the rent point has to live somewhere else in a North
    Carolina lease. It lives in the default clause, under §42-26(c).
  */
  it('puts the North Carolina partial-rent rule where its statute puts it', () => {
    expect(clause('default.notices-nc').body).toMatch(/§42-26\(c\)/);
    expect(clause('general.waiver-nc').body).not.toMatch(/rent/i);
  });
});

// ── The statutes each clause claims ────────────────────────────────────────

describe('every figure in the North Carolina set is the statute’s own', () => {
  it('§42-3 — ten days after a demand for past-due rent', () => {
    expect(clause('default.notices-nc').body).toMatch(/within 10 days after that demand/i);
    expect(clause('default.notices-nc').body).toMatch(/§42-3/);
  });

  it('§42-42(a)(5) and (a)(7) — fifteen days to replace or repair an alarm', () => {
    const body = clause('maintenance.detectors-nc').body;

    expect(body).toMatch(/§42-42\(a\)\(5\)/);
    expect(body).toMatch(/§42-42\(a\)\(7\)/);
    expect(body).toMatch(/tamper-resistant/i);
  });

  /*
    §42-46(a)(1), read verbatim: "a late fee not to exceed fifteen dollars
    ($15.00) or five percent (5%) of the monthly rent, whichever is greater",
    "chargeable only if any rental payment is five calendar days or more late,
    with the first day being the day after the rent was due".

    THE FLOOR IS IN THE CLAUSE, not only in the answer. A landlord may set a
    longer grace period than the statute requires and the clause honours it;
    what the clause will not do is charge earlier than the fifth day because
    somebody typed 2. Nothing else enforces that — see the rule-pack note in the
    PR — so the sentence has to carry it.
  */
  it('§42-46(a) — five calendar days, and the greater of $15 or 5%', () => {
    const body = clause('rent.late-fee-nc').body;

    expect(body).toMatch(/five calendar days or more late/i);
    expect(body).toMatch(
      /fifteen dollars \(\$15\.00\) or five percent \(5%\) of the monthly rent, whichever is greater/,
    );
    expect(body).toMatch(/only once for each late rental payment/i);
    expect(body).toMatch(/\{\{graceDays\}\}/);
  });

  it('§42-46(e)-(g) — 5%, 10% and 12%, and only one of them', () => {
    const body = clause('fees.litigation-nc').body;

    expect(body).toMatch(/complaint-filing fee/i);
    expect(body).toMatch(/ten percent \(10%\) of the monthly rent/);
    expect(body).toMatch(/twelve percent \(12%\) of the monthly rent/);
    expect(body).toMatch(/only one of these three fees/i);
    expect(body).toMatch(/fifteen percent \(15%\)/);
  });

  /*
    §42-52's LAST TWO SENTENCES, and the one this clause first left out.

    "If the tenant's address is unknown the landlord shall apply the deposit as
    permitted in G.S. 42-51 after a period of 30 days and the landlord shall
    hold the balance of the deposit for collection by the tenant for at least
    six months."

    An absence that costs the tenant something, which is the shape the Florida
    statutory walk found twice. The clause already required a forwarding
    address, which is the trigger for this branch, and then said nothing about
    what happens when there is not one — leaving a tenant who moved without
    leaving an address to assume the money was simply gone.
  */
  it('§42-52 — six months to collect where the address is unknown', () => {
    const body = clause('deposit.accounting-nc').body;

    expect(body).toMatch(/at least six months/i);
    expect(body).toMatch(/normal wear and tear/i);
    expect(body).toMatch(/exceeds Landlord’s actual damages/i);
  });

  it('§42-50 — a trust account in this State, or a bond', () => {
    const body = clause('deposit.held-nc').body;

    expect(body).toMatch(/§42-50/);
    expect(body).toMatch(/adequate bond in the amount of the deposit/i);
  });

  /*
    A LATE FEE MAY NOT BE CHARGED ON A WATER OR SEWER ARREAR — §42-46(d) — and
    an arrear for those services may not found an eviction — §42-26(b). Both are
    easy to miss precisely because they sit in subsections about something else.
  */
  it('§42-46(d) — no late fee on a water or sewer arrear', () => {
    expect(clause('rent.late-fee-nc').body).toMatch(/water or sewer service/i);
  });

  it('pins the requiredBy of every North Carolina clause that claims one', () => {
    const cited = Object.fromEntries(NC_LIBRARY.filter((c) => c.requiredBy).map((c) => [c.slug, c.requiredBy]));

    expect(cited).toEqual({
      'deposit.held-nc': 'N.C. Gen. Stat. §42-50',
      'deposit.held-carried-nc': 'N.C. Gen. Stat. §42-50',
      'deposit.escrow-notice-nc': 'N.C. Gen. Stat. §42-50',
      'deposit.accounting-nc': 'N.C. Gen. Stat. §42-52',
      'maintenance.landlord-statutory-nc': 'N.C. Gen. Stat. §42-42(a)',
      'maintenance.detectors-nc': 'N.C. Gen. Stat. §42-42(a)(5)',
      'default.notices-nc': 'N.C. Gen. Stat. §42-3',
      'moveout.personal-property-nc': 'N.C. Gen. Stat. §42-25.7',
      'rent.late-fee-nc': 'N.C. Gen. Stat. §42-46(a)',
      'fees.litigation-nc': 'N.C. Gen. Stat. §42-46',
      'notices.landlord-address-nc': 'N.C. Gen. Stat. §42-42(a)(4)',
    });
  });
});

// ── Assembly ───────────────────────────────────────────────────────────────

describe('a North Carolina lease assembles', () => {
  /*
    §42-46(b) permits ONE late fee for each late rental payment, so the tiered
    Florida-era clause cannot render in North Carolina. Superseding is how that
    is expressed — the generic clauses stay in every other state's library and
    simply lose to this one.
  */
  it('replaces both generic late-fee clauses rather than competing with them', () => {
    expect(clause('rent.late-fee-nc').supersedes.sort()).toEqual(['rent.late-fee-flat', 'rent.late-fee-tiered']);
  });

  it('carries the deposit forward rather than billing it twice', () => {
    expect(clause('deposit.held-carried-nc').supersedes).toEqual(['deposit.held-nc']);
    expect(clause('deposit.advance-rent-carried-nc').supersedes).toEqual(['deposit.advance-rent-nc']);
  });

  /*
    The counts, so that the shape of the second state is visible rather than
    described. Seventeen clauses of its own against Florida's twenty-eight, and
    every one of the thirty-six portable clauses shared.
  */
  it('is 36 portable clauses and 17 of its own', () => {
    const nc = libraryFor('US-NC');

    expect(NC_LIBRARY.length).toBe(17);
    expect(nc.length).toBe(53);
    expect(nc.filter((c) => c.jurisdiction === 'US-NC').length).toBe(17);
  });
});
