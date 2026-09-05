import { describe, expect, it } from 'vitest';
import type { ClauseFacts } from '../clauses/types';
import { FL_LIBRARY } from '../clauses/us-fl';
import { selectClauses } from '../engine/select-clauses';

/**
 * Selection is where a fixed template stops and a clause graph starts. Given a
 * set of facts, the engine decides which clauses exist in this document,
 * resolves the ones that replace each other, numbers what survives, and reports
 * anything asserted twice.
 *
 * The fixtures are the real tenancies at 29090 Picana Ln.
 */

const NEW_TENANCY: ClauseFacts = {
  termMonths: 12,
  depositHeldUsd: 6900,
  advanceRentHeldUsd: 6900,
  depositCarriedInUsd: 0,
  advanceRentCarriedInUsd: 0,
  propertyYearBuilt: 2005,
  petsPermitted: true,
  hasNamedOccupants: false,
  hasHoa: true,
  // Derived in hydrateMatter; stated here because these fixtures drive clause
  // selection directly rather than going through it.
  hasPetFees: false,
  hasHoaLeaseRequirements: false,
  hasHoaGoverningDocuments: false,
  hasConditionReport: false,
  prorationApplies: false,
  propertyType: 'single-family',
  hasPool: true,
  hasYardAllocation: true,
  hasTenantYardDuty: true,
  lateFeePolicy: 'tiered',
  terminationOnSale: true,
  holdoverPenalty: true,
  earlyTerminationOffered: true,
  nonRenewalNoticeRequired: true,
  electronicNoticesElected: false,
};

/**
 * Every clause the facts select, wherever it lands. Standalone disclosures are
 * still selected — they just leave the lease body — so an inclusion question
 * has to look at both lists. Where the *placement* is what matters, the test
 * reads the two lists separately.
 */
const slugs = (facts: ClauseFacts) => {
  const { selected, addenda, standaloneDisclosures } = selectClauses({ facts, library: FL_LIBRARY });

  return [...selected, ...addenda, ...standaloneDisclosures].map((c) => c.slug);
};

describe('selectClauses — inclusion', () => {
  it('includes unconditional clauses', () => {
    expect(slugs(NEW_TENANCY)).toContain('parties.recital');
    expect(slugs(NEW_TENANCY)).toContain('rent.base');
    expect(slugs(NEW_TENANCY)).toContain('disclosure.radon');
  });

  it('drops clauses whose condition is not met', () => {
    const noHoa = slugs({ ...NEW_TENANCY, hasHoa: false });

    expect(noHoa).not.toContain('hoa.compliance');
  });

  it('drops the lead disclosure for post-1978 construction', () => {
    expect(slugs(NEW_TENANCY)).not.toContain('disclosure.lead-paint');
    expect(slugs({ ...NEW_TENANCY, propertyYearBuilt: 1960 })).toContain('disclosure.lead-paint');
  });

  it('includes the flood disclosure only at a year or longer', () => {
    expect(slugs(NEW_TENANCY)).toContain('disclosure.flood');
    expect(slugs({ ...NEW_TENANCY, termMonths: 6 })).not.toContain('disclosure.flood');
  });

  it('omits a proration clause when the term starts on the rent due day', () => {
    // The dead-section problem: a Florida lease should not carry a snow-removal
    // clause, and a lease starting on the 1st should not explain proration.
    expect(slugs(NEW_TENANCY)).not.toContain('rent.proration');
    expect(slugs({ ...NEW_TENANCY, prorationApplies: true })).toContain('rent.proration');
  });
});

describe('selectClauses — supersession', () => {
  it('keeps only the tiered late fee when tiered is elected', () => {
    const s = slugs(NEW_TENANCY);

    expect(s).toContain('rent.late-fee-tiered');
    expect(s).not.toContain('rent.late-fee-flat');
  });

  it('keeps the flat late fee when flat is elected', () => {
    const s = slugs({ ...NEW_TENANCY, lateFeePolicy: 'flat' });

    expect(s).toContain('rent.late-fee-flat');
    expect(s).not.toContain('rent.late-fee-tiered');
  });

  it('reports what it removed and why', () => {
    const result = selectClauses({
      facts: { ...NEW_TENANCY, lateFeePolicy: 'flat' },
      // Force both into contention so supersession has something to resolve.
      library: FL_LIBRARY.map((c) => (c.slug.startsWith('rent.late-fee') ? { ...c, includeWhen: null } : c)),
    });

    expect(result.superseded).toEqual([{ slug: 'rent.late-fee-flat', by: 'rent.late-fee-tiered' }]);
  });
});

describe('selectClauses — numbering', () => {
  it('numbers sections in document order, starting at 1', () => {
    const selected = selectClauses({ facts: NEW_TENANCY, library: FL_LIBRARY }).selected;
    const first = selected[0];

    expect(first.slug).toBe('parties.recital');
    expect(first.number).toBe('1');
  });

  it('numbers clauses sharing a section as sub-clauses of it', () => {
    const selected = selectClauses({ facts: NEW_TENANCY, library: FL_LIBRARY }).selected;
    const rent = selected.filter((c) => c.slug.startsWith('rent.'));

    // Three rent clauses survive for this fixture: base, tiered late fee,
    // returned payments. They must read 4.1, 4.2, 4.3 under one §4.
    expect(rent.map((c) => c.number)).toEqual(['4.1', '4.2', '4.3']);
  });

  it('renumbers without gaps when a clause drops out', () => {
    // Numbering is derived from what survives, never hard-coded. Removing the
    // HOA clause must not leave a hole or shift a later section's identity
    // relative to its own contents.
    const selected = selectClauses({ facts: { ...NEW_TENANCY, hasHoa: false }, library: FL_LIBRARY }).selected;
    const numbers = selected.map((c) => c.number.split('.')[0]);
    const sections = [...new Set(numbers)].map(Number);

    expect(sections).toEqual(sections.map((_, i) => i + 1));
  });
});

describe('selectClauses — separating what goes where', () => {
  it('keeps the flood disclosure out of the lease body', () => {
    // Fla. Stat. §83.512 requires a separate document. If this ever leaks into
    // the body the disclosure does not comply, so it is asserted here as well
    // as on the clause.
    const result = selectClauses({ facts: NEW_TENANCY, library: FL_LIBRARY });

    expect(result.standaloneDisclosures.map((c) => c.slug)).toContain('disclosure.flood');
    expect(result.selected.map((c) => c.slug)).not.toContain('disclosure.flood');
  });
});

describe('selectClauses — addenda are their own documents', () => {
  it('keeps an addendum out of the numbered lease body', () => {
    // An addendum carries its own signature block and is attached to the
    // lease; numbering it as a section of the body misrepresents what it is,
    // and would have put "7. Pet Addendum" between the HOA clause and the
    // notices section.
    const result = selectClauses({ facts: NEW_TENANCY, library: FL_LIBRARY });

    expect(result.selected.map((c) => c.slug)).not.toContain('pets.addendum');
    expect(result.addenda.map((c) => c.slug)).toContain('pets.addendum');
  });

  it('numbers the body as though addenda were never there', () => {
    const result = selectClauses({ facts: NEW_TENANCY, library: FL_LIBRARY });
    const sections = [...new Set(result.selected.map((c) => Number(c.number.split('.')[0])))];

    expect(sections).toEqual(sections.map((_, i) => i + 1));
  });
});

describe('selectClauses — duplicate assertions', () => {
  it('is quiet when nothing is asserted twice', () => {
    expect(selectClauses({ facts: NEW_TENANCY, library: FL_LIBRARY }).duplicateAssertions).toEqual([]);
  });

  it('flags the same assertion made by two clauses', () => {
    // The 2026 lease stated joint-and-several liability in §2.5.8 and again in
    // custom clause F, because nothing could see across the two. This is that
    // check.
    const withCustom = [
      ...FL_LIBRARY,
      {
        ...FL_LIBRARY[0],
        slug: 'custom.joint-liability',
        heading: 'Joint and Several Liability',
        asserts: ['joint-and-several-liability'],
        supersedes: [],
      },
    ];

    const result = selectClauses({ facts: NEW_TENANCY, library: withCustom });

    expect(result.duplicateAssertions).toEqual([
      { assertion: 'joint-and-several-liability', slugs: ['parties.recital', 'custom.joint-liability'] },
    ]);
  });
});
