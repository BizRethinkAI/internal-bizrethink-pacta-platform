import { describe, expect, it } from 'vitest';

import { LOMBARD_FACTS, type McaFacts } from '../../clauses/facts';
import { libraryFor } from '../../clauses/library';
import type { McaClause } from '../../clauses/types';
import { instrumentsFor, selectClauses } from '../select-clauses';

/**
 * The engine, and the one property that makes it worth having.
 *
 * A clause library is only a library if the same clauses can produce different
 * documents. Until this file, `includeWhen` existed on 205 records and nothing
 * read any of them — the forward scaffolding `clauses/types.ts` warns about,
 * which is why the facts type and its first consumer land together.
 */

/** A second funder, differing from Lombard on exactly the axes under test. */
const ARBITRATION_FUNDER: McaFacts = {
  ...LOMBARD_FACTS,
  disputeResolution: 'arbitration',
  concurrentPositions: false,
  renewalModel: 'none',
  equipment: 'none',
};

/**
 * `Section 8.2`, `Sections 3.3, 3.4 and 4.15` — the numbers a body cites.
 *
 * The trailing `(?![0-9a-zA-Z-])` on each token is load-bearing and was added
 * after the first run reported §4.13 citing a "Section 36": the clause names
 * *Connecticut General Statutes Section 36a-869*, and a pattern that stops at
 * the digits turns a statute into a dangling internal reference.
 */
const SECTION_REFERENCE =
  /\bSections?\s+(\d+(?:\.\d+)*(?![0-9a-zA-Z-])(?:\s*(?:,|and|or|through|to)\s*\d+(?:\.\d+)*(?![0-9a-zA-Z-]))*)/g;

const citations = (body: string): string[] => {
  const found: string[] = [];

  for (const match of body.matchAll(SECTION_REFERENCE)) {
    for (const token of match[1].matchAll(/\d+(?:\.\d+)*/g)) {
      /*
        Section 1 is the AcroForm grid the Lombard pipeline injects, and no
        clause in this library holds it — which is why `FRPA_LOCUS_EXCLUSIONS`
        already declares 1.3, 1.4 and 1.5 as numbers the document has and the
        library does not. Excluded here for the same reason, not as a
        convenience.
      */
      if (!/^1(\.|$)/.test(token[0])) {
        found.push(token[0]);
      }
    }
  }

  return found;
};

/** `slug -> Section N.M`, for every reference this profile leaves unresolved. */
const danglingIn = (facts: McaFacts, library?: McaClause[]): string[] => {
  const { selected } = selectClauses({ facts, instrument: 'frpa', library });
  const numbers = selected.map((clause) => clause.number).filter((number) => number !== '');
  const dangling = new Set<string>();

  for (const clause of selected) {
    for (const reference of citations(clause.body)) {
      // `6.1` answers a citation of `6.1.3`? No — the other way. A citation of
      // `6` is answered by any `6.x`; a citation of `6.1.3` needs a clause
      // numbered `6.1.3`, and §6.1's three lettered limbs are not it.
      const resolved = numbers.some((number) => number === reference || number.startsWith(`${reference}.`));

      if (!resolved) {
        dangling.add(`${clause.slug} -> Section ${reference}`);
      }
    }
  }

  return [...dangling].sort();
};

/**
 * References that dangle today, each named, quoted and owned.
 *
 * A register rather than a filter. Every entry has to stay reachable — the
 * assertion below fails if one stops dangling — for the reason `twins.test.ts`
 * gives about its divergence list: a tolerated defect that has quietly been
 * fixed is a line of a test that can no longer be red.
 *
 * None of these is `renewal-positions`' to fix, and fixing someone else's
 * clause to quiet a check is how a cluster's blast radius grows.
 */
const KNOWN_GAPS: { to: string; from: string[]; quote: string; owner: string }[] = [
  /*
    CLOSED 2026-09-10 AND DELETED, NOT LEFT STANDING.

    `frpa.electronic-account-monitoring-authorization-plaid-4-16 -> Section
    6.1.1` was the first entry here. §4.16 no longer makes a lapse a default at
    all, so the citation has gone rather than moved: the clause now says a lapse,
    a token expiry, an outage or a good-faith revocation "is not an Event of
    Default and gives Buyer no remedy", and points at the §6.1 that exists for
    the reason — a loss of access to information or to a system is in its
    not-a-default list. `data-and-channel` owned it and removed it in the same
    change, which is what the assertion below exists to force.
  */
  {
    /*
      Same cause. §6.3 was rewritten to a single aggregate ceiling with no
      numbered limbs; §7.9's own comment already records that it "defers to
      §6.3.1", which now supplies nothing.

      THE OWNER WAS STALE AND IS CORRECTED RATHER THAN LEFT. This entry said
      `miscellaneous`. That cluster has run: it rewrote §7.9 and wrote the
      citation of §6.3.1 into the new body deliberately, because §6.3.1 exists as
      a NUMBERED PARAGRAPH inside `frpa.costs-of-collection-6-3` — the body ends
      "6.3.1 Prejudgment and Postjudgment Interest" followed by the rule — and a
      reader of the assembled document finds it. What does not find it is this
      check, which reads `McaClause.number` and sees only `6.3`.

      So it is not §7.9's defect and it is not §6.3's either. It is the one place
      in the corpus where a clause record holds two numbered provisions, and the
      fix is a library change: split §6.3.1 into its own record, which moves the
      pinned counts in `frpa-coverage`, `library` and `surface` and renumbers
      nothing. `disputes-service` found this on 2026-09-10 while closing out the
      rewrite and did not take it: §6.3 is not its clause, and
      `a-fee-is-a-debt-not-a-purchase.test.ts` pins §6.3's contents in three
      assertions that a split would have to be checked against.

      **UNOWNED. The nine-cluster rewrite is finished and no cluster follows.**
    */
    to: 'Section 6.3.1',
    from: ['frpa.indemnification-7-9'],
    quote: 'interest accrues only as Section 6.3.1 permits',
    owner: 'UNASSIGNED — §6.3.1 is a paragraph inside frpa.costs-of-collection-6-3, not a record',
  },
  {
    /*
      THE GUARANTY GAP, SEEN FROM OUTSIDE SECTION 9.

      §§9.2, 9.4, 9.5 and 9.6 gate on `guarantyScope === 'limited-conduct'`,
      which is the only guaranty this library has drafted. `full-performance` is
      a value of the fact with no clause behind it — deliberately, because the
      wide guaranty is the one all three market forms use and the one the memo
      argues against — so a full-performance funder selects §9.1's identity grid
      and §§10.2/10.4's guarantor execution blocks with **no guaranty between
      them**, and these six clauses go on limiting a Guarantor's liability by
      reference to a §9.2 the document does not contain. `guarantyScope: 'none'`
      produces the same six.

      NOT §9.1'S OWN GATE, which is fixed: `frpa.guarantor-information-9-1` was
      ungated and is now `guarantyScope !== 'none'`, so a `none` funder collects
      no Social Security Number for a guaranty it does not have. What is left is
      the `full-performance` half, and it is real. `guaranty` owns it.
    */
    to: 'Section 9.2',
    from: [
      'frpa.security-interest-4-10',
      'frpa.remedies-4-12',
      'frpa.unencumbered-receipts-5-11',
      'frpa.remedies-6-2',
      'frpa.costs-of-collection-6-3',
      'frpa.indemnification-7-9',
    ],
    quote: 'A claim against a Guarantor may be brought only as Section 9.2 permits.',
    owner: 'guaranty',
  },
  {
    /*
      And the whole of Section 9 under `guarantyScope: 'none'`, where four
      clauses reserve remedies to a section that is now entirely absent. Visible
      only since §9.1 was gated — while §9.1 was ungated, its number answered a
      bare "Section 9" and hid these four behind a grid of blanks.
    */
    to: 'Section 9',
    from: [
      'frpa.sales-of-receipts-not-a-loan-2-1',
      'frpa.completion-threshold-2-6',
      'frpa.representations-lead-in',
      'frpa.civil-criminal-regulatory-matters-5-14',
    ],
    quote: 'Buyer’s remedies are limited by Section 6, and the Guaranty is limited by Section 9.',
    owner: 'guaranty',
  },
];

const KNOWN = new Set(KNOWN_GAPS.flatMap(({ from, to }) => from.map((slug) => `${slug} -> ${to}`)));

/**
 * The profiles this property is checked over.
 *
 * Not exhaustive over `McaFacts` — that is 2 × 3 × 2 × 2 × 3 × 2 × … and most
 * of the product is unreachable — but every fact that gates an FRPA clause is
 * moved by at least one row, which is what makes a broken reference findable.
 */
const PROFILES: { name: string; facts: McaFacts }[] = [
  { name: 'Lombard', facts: LOMBARD_FACTS },
  { name: 'the arbitration funder', facts: ARBITRATION_FUNDER },
  {
    name: 'a funder that carries a prior balance and holds concurrent positions',
    facts: { ...LOMBARD_FACTS, renewalModel: 'carry', concurrentPositions: true },
  },
  { name: 'a funder that takes no guaranty', facts: { ...LOMBARD_FACTS, guarantyScope: 'none' } },
  {
    name: 'a funder that takes the wide guaranty',
    facts: { ...LOMBARD_FACTS, guarantyScope: 'full-performance' },
  },
  {
    name: 'a funder with no broker channel and no consumer report',
    facts: { ...LOMBARD_FACTS, brokerChannel: false, consumerReportPulled: false },
  },
  { name: 'a funder that offers no equipment', facts: { ...LOMBARD_FACTS, equipment: 'none' } },
  { name: 'a funder that collects by ACH', facts: { ...LOMBARD_FACTS, collectionMethod: 'ach-only' } },
  {
    name: 'a funder lending into Texas on an accepted split',
    facts: { ...LOMBARD_FACTS, processorSplitAccepted: true, recipientStates: ['US-TX'] },
  },
];

describe('selection turns a funder profile into a document', () => {
  /**
   * **Every cross-reference in a selected clause points at a clause that is
   * also selected.**
   *
   * THIS REPLACES *"selects every clause of the FRPA for the funder whose paper
   * it is"*, which asserted `selected.length === all.length` and
   * `excluded.length === 0`. That assertion was correct on its own premise and
   * the premise has been reversed by the owner. Its docstring said so out loud:
   * the property held *because* "`LOMBARD_FACTS` describes the paper as shipped
   * rather than as the 2026-09-09 memo recommends". As of 2026-09-10 the
   * profile records the memo's recommended design instead, so a Lombard
   * template deliberately excludes the clauses that design removes, and a test
   * demanding completeness would demand the defect back. It is the third
   * fidelity guard to go, after `bodies-match-the-document` and
   * `frpa-coverage`'s line-accounting.
   *
   * COMPLETENESS WAS NEVER THE PROPERTY WORTH HAVING. `selected.length ===
   * all.length` cannot fail for a profile that turns nothing off, and it cannot
   * detect the failure that actually matters: a document that cites §8.2 while
   * §8.2 was gated out. Both halves of this cluster's own change would have
   * produced exactly that — `payoff-only` dropped §8.2 while §004 still pointed
   * at it, and `concurrentPositions: false` dropped §4.15 while §7.1 still
   * carved it out of the amendment rule — and the retired assertion would have
   * gone green on both.
   *
   * WHAT A DANGLING REFERENCE COSTS. `select-clauses.ts` has no `[Reserved]`
   * sections and never will: "the clause is simply not selected, and nothing
   * downstream knows it could have been". That is the right design and it is
   * precisely why this check is needed. A gap leaves no marker, so the only
   * evidence a clause went missing is a sentence somewhere else still talking
   * about it.
   */
  it('leaves no dangling cross-reference in any funder’s document', () => {
    for (const { name, facts } of PROFILES) {
      const unexpected = danglingIn(facts).filter((gap) => !KNOWN.has(gap));

      expect(unexpected, `${name} assembles a document with a dangling cross-reference`).toEqual([]);
    }
  });

  /**
   * The register cannot go write-only.
   *
   * A tolerated gap that has been fixed elsewhere must be deleted from the list
   * rather than left as a line that can no longer fail — the argument
   * `twins.test.ts` makes about its declared divergences, and the argument the
   * brief makes about the two assertions in this package that filtered on
   * `Divergence` kinds that do not exist and passed vacuously for a day.
   */
  it('keeps every declared gap reachable', () => {
    const reachable = new Set(PROFILES.flatMap(({ facts }) => danglingIn(facts)));

    for (const { from, to, owner } of KNOWN_GAPS) {
      for (const slug of from) {
        expect(
          reachable.has(`${slug} -> ${to}`),
          `${slug} -> ${to} no longer dangles; delete it (owner: ${owner})`,
        ).toBe(true);
      }
    }
  });

  /**
   * And the check itself can be red, which is the only thing that makes the two
   * assertions above evidence rather than decoration.
   */
  it('finds a dangling reference when there is one', () => {
    const anchor = libraryFor('frpa').find((clause) => clause.slug === 'frpa.definitions');

    if (!anchor) {
      throw new Error('no frpa.definitions');
    }

    const citing: McaClause = { ...anchor, slug: 'test.cites', number: '', body: 'As Section 44.7 provides.' };
    const cited: McaClause = { ...anchor, slug: 'test.cited', number: '44.7', body: 'Buyer shall do it.' };

    // The reference resolves when the clause it names is in the same document…
    expect(danglingIn(LOMBARD_FACTS, [citing, cited])).toEqual([]);
    // …and does not when it is not.
    expect(danglingIn(LOMBARD_FACTS, [citing])).toEqual(['test.cites -> Section 44.7']);
    // A statute is not an internal reference, whatever the word before it.
    expect(citations('Connecticut General Statutes Section 36a-869 where that section applies')).toEqual([]);
  });

  /**
   * The other half of `library.test.ts`'s narrowed number rule.
   *
   * That file can prove a shared number is shared only by conditional clauses;
   * it cannot prove that no two of them reach the same document, because it has
   * no facts and no engine. This can. A document with two §4.15s is a document
   * whose every cross-reference to §4.15 is ambiguous, which is the failure the
   * two assertions are jointly for.
   */
  it('gives an assembled document one clause per section number', () => {
    for (const { name, facts } of PROFILES) {
      const { selected } = selectClauses({ facts, instrument: 'frpa' });
      const numbers = selected.map((clause) => clause.number).filter((number) => /^\d+\.\d+$/.test(number));

      expect(new Set(numbers).size, `${name} assembles a document with a repeated section number`).toBe(numbers.length);
    }
  });

  /**
   * A fact that decides a LIMB rather than a clause is resolved by splitting the
   * clause, not by widening `includeWhen`.
   *
   * `concurrentPositions` used to gate the whole of §4.15, so turning it off
   * deleted the multi-position rule instead of stating the opposite one, and
   * `renewalModel` gated the whole of §8.2, so `payoff-only` deleted the Deduct
   * method a payoff funder needs. Both are now exhaustive pairs: for every value
   * of the fact, exactly one clause of the pair is selected.
   */
  it('replaces a gated clause rather than leaving a hole', () => {
    const single = selectClauses({ facts: { ...LOMBARD_FACTS, concurrentPositions: false }, instrument: 'frpa' });
    const concurrent = selectClauses({ facts: { ...LOMBARD_FACTS, concurrentPositions: true }, instrument: 'frpa' });
    const slugs = (result: { selected: { slug: string }[] }) => result.selected.map((clause) => clause.slug);

    expect(slugs(single)).toContain('frpa.single-active-position-4-15');
    expect(slugs(single)).not.toContain('frpa.position-and-cascade-of-collections-4-15');
    expect(slugs(concurrent)).toContain('frpa.position-and-cascade-of-collections-4-15');
    expect(slugs(concurrent)).not.toContain('frpa.single-active-position-4-15');

    const payoff = selectClauses({ facts: { ...LOMBARD_FACTS, renewalModel: 'payoff-only' }, instrument: 'frpa' });
    const carry = selectClauses({ facts: { ...LOMBARD_FACTS, renewalModel: 'carry' }, instrument: 'frpa' });
    const none = selectClauses({ facts: { ...LOMBARD_FACTS, renewalModel: 'none' }, instrument: 'frpa' });

    expect(slugs(payoff)).toContain('frpa.rollover-methods-8-2');
    expect(slugs(payoff)).not.toContain('frpa.rollover-carry-method-8-2');
    expect(slugs(carry)).toContain('frpa.rollover-carry-method-8-2');
    expect(slugs(carry)).not.toContain('frpa.rollover-methods-8-2');
    expect(slugs(none)).not.toContain('frpa.rollover-methods-8-2');
    expect(slugs(none)).not.toContain('frpa.rollover-carry-method-8-2');
  });

  /**
   * And the converse, which is the point of a library: a different funder gets a
   * different document out of the same clauses.
   */
  it('drops what a second funder does not buy', () => {
    const { selected, excluded } = selectClauses({ facts: ARBITRATION_FUNDER, instrument: 'frpa' });

    expect(excluded.length).toBeGreaterThan(0);
    expect(selected.length).toBe(libraryFor('frpa').length - excluded.length);

    const dropped = excluded.map(({ clause }) => clause.slug).sort();

    // Four clauses, one decision. The memo proposes deleting each of these
    // separately; under arbitration they are a single fact's consequence.
    expect(dropped).toContain('frpa.jury-trial-waiver-7-10');
    expect(dropped).toContain('frpa.class-action-waiver-7-11');
    expect(dropped).toContain('frpa.contractual-statutes-of-limitations-7-19');
    expect(dropped).toContain('frpa.counterclaim-waiver-7-20');

    // And the cascade goes with concurrentPositions, not with anything textual.
    expect(dropped).toContain('frpa.position-and-cascade-of-collections-4-15');
  });

  /**
   * A dropped clause leaves no gap, which is the whole answer to `[Reserved]`.
   *
   * A document edited in place needs reserved sections to hold numbering still
   * for the cross-references pointing at them. A document assembled from a
   * library does not: the clause is simply absent, and nothing downstream knows
   * it could have been there.
   */
  it('leaves no reserved section behind when a clause drops out', () => {
    const { selected } = selectClauses({ facts: ARBITRATION_FUNDER, instrument: 'frpa' });

    for (const clause of selected) {
      expect(clause.heading).not.toBe('[Reserved]');
      expect(clause.body.trim()).not.toBe('[Reserved]');
    }
  });

  /**
   * Reading order survives selection. `inReviewOrder` sorts by instrument, then
   * the instrument's own section order, then `sortKey` — and a document whose
   * clauses arrive in module-concatenation order is what that function was
   * written to stop.
   */
  it('returns clauses in reading order, not library order', () => {
    const { selected } = selectClauses({ facts: LOMBARD_FACTS, instrument: 'frpa' });
    const keys = selected.map((clause) => clause.sortKey);

    // funding-terms, not preamble: the FRPA prints its Section 1 grid and the
    // funding explainers before the parties paragraph, and FRPA_SECTION_ORDER
    // follows the document rather than convention.
    expect(selected[0]?.section).toBe('funding-terms');
    expect(keys.length).toBeGreaterThan(0);
  });

  /**
   * Refused rather than filtered.
   *
   * The Equipment Lease and the Subscription number their clauses IDENTICALLY,
   * so assembling one into the other's document produces something that reads
   * correct and is wrong at every cross-reference. `clauses/library.ts` makes
   * the same argument for reaching clauses through `libraryFor`.
   */
  it('refuses a library that is not the instrument it was asked for', () => {
    expect(() =>
      selectClauses({ facts: LOMBARD_FACTS, instrument: 'frpa', library: libraryFor('subscription') }),
    ).toThrow(/is a subscription clause/);
  });
});

describe('which agreements a product involves at all', () => {
  it('gives Lombard the set its deals actually use', () => {
    const instruments = instrumentsFor(LOMBARD_FACTS);

    expect(instruments).toContain('frpa');
    // Lombard runs a broker channel and pulls consumer reports.
    expect(instruments).toContain('iso-pra');
    expect(instruments).toContain('permission-to-release');
    /*
     * The twins ARE part of this product, and this assertion used to say the
     * opposite on the reasoning that "v4 defers equipment into the Purchased
     * Amount rather than leasing it". Deferred equipment is gone (owner,
     * 2026-09-10), the merchant elects buy or lease at signing, and §002 sends
     * the lease path to a separate written agreement — so a suite without them
     * has a clause pointing at a document that does not exist.
     */
    expect(instruments).toContain('equipment-lease');
    expect(instruments).toContain('subscription');
    // And a funder that does not offer equipment at all still gets neither.
    const noEquipment = instrumentsFor({ ...LOMBARD_FACTS, equipment: 'none' });
    expect(noEquipment).not.toContain('equipment-lease');
    expect(noEquipment).not.toContain('subscription');
  });

  it('drops the broker agreement for a funder with no channel', () => {
    expect(instrumentsFor({ ...LOMBARD_FACTS, brokerChannel: false })).not.toContain('iso-pra');
  });

  /**
   * The ISO PRA is the document a merchant must never be handed — its §2.6
   * exists because 10 CCR §952 and 23 NYCRR §600.21 regulate what a broker may
   * put in front of a recipient. `instrumentsFor` answers which agreements the
   * PRODUCT involves; `merchantFacing()` remains the filter for anything
   * merchant-bound, and this pins that they are different questions.
   */
  it('is not a merchant-facing filter', () => {
    expect(instrumentsFor(LOMBARD_FACTS)).toContain('iso-pra');
  });
});
