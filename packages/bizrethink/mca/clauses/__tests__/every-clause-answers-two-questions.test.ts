import { describe, expect, it } from 'vitest';
import { ALL_MCA_CONTENT } from '../../catalogue';
import { isMcaApprovalCurrent, mcaClauseFingerprint, mcaLibraryFingerprint } from '../approval';
import { LOMBARD_FACTS, type McaFacts } from '../facts';

describe('ADR 0014 clause metadata', () => {
  it('requires an explicit legal classification and variance on all current clause and reusable records', () => {
    expect(ALL_MCA_CONTENT).toHaveLength(237);
    for (const clause of ALL_MCA_CONTENT) {
      expect(clause.whyThisClause, clause.slug).toBeDefined();
      expect(clause.variance, clause.slug).toBeDefined();
      expect(clause).not.toHaveProperty('requiredBy');
      expect(clause.status, clause.slug).toBe('draft');
      expect(clause.source).toEqual({ kind: 'attorney-drafted', author: null });
      const why = clause.whyThisClause;
      expect(['compelled', 'implements', 'discretionary']).toContain(why.kind);
      expect(['fixed', 'offered']).toContain(clause.variance.kind);
      if (why.kind !== 'discretionary') {
        expect(why.citation.trim().length, clause.slug).toBeGreaterThan(0);
      }
      if (why.kind === 'compelled') {
        expect(why.appliesWhen.trim().length, clause.slug).toBeGreaterThan(0);
      }
      if (clause.variance.kind === 'fixed') {
        expect(['compelled', 'misattributed', 'no-alternative', 'unwritable', 'load-bearing']).toContain(
          clause.variance.because,
        );
        expect(clause.variance.note.trim().length, clause.slug).toBeGreaterThan(30);
      }
    }
  });

  it('distinguishes prescribed Texas notice text from our payment-method wording', () => {
    expect(
      ALL_MCA_CONTENT.filter((clause) => clause.whyThisClause.kind === 'compelled').map((clause) => clause.slug),
    ).toEqual(['frpa.texas-occc-notice-7-25']);
    const notice = ALL_MCA_CONTENT.find((clause) => clause.slug === 'frpa.texas-occc-notice-7-25')!;
    expect(notice.whyThisClause).toMatchObject({ kind: 'compelled', citation: '7 TAC §86.310(d)' });
    expect(notice.variance).toMatchObject({ kind: 'fixed', because: 'compelled' });
    const method = ALL_MCA_CONTENT.find((clause) => clause.slug === 'frpa.collection-mechanism-and-term-2-2')!;
    expect(method.whyThisClause.kind).toBe('implements');
    if (method.whyThisClause.kind === 'implements') {
      for (const citation of ['10-1-393.18(e)(4)', '7-27-202(3)', '75-784(b)(5)', '427.300.3(2)(e)']) {
        expect(method.whyThisClause.citation).toContain(citation);
      }
    }
  });

  it('records the rejected gates as reasons rather than silently introducing choices', () => {
    const reasons = {
      'frpa.stacking-prohibited-5-16': 'misattributed',
      'frpa.negative-pledge-4-11': 'misattributed',
      'frpa.financial-condition-4-3': 'misattributed',
      'frpa.merchant-deposit-agreement-4-1': 'no-alternative',
      // Venue left this clause and became an exhaustive pair on `venueRule`;
      // what remains applies under every programme.
      'frpa.binding-effect-governing-law-venue-and-jurisdiction-7-5': 'load-bearing',
      'frpa.primary-collection-split-funding-via-approved-processor-2-3': 'load-bearing',
    };
    for (const [slug, because] of Object.entries(reasons)) {
      const clause = ALL_MCA_CONTENT.find((candidate) => candidate.slug === slug)!;
      expect(clause.variance, slug).toMatchObject({ kind: 'fixed', because });
      expect(clause.includeWhen, slug).toBeNull();
    }
  });

  it('offers only groups that select exactly one alternative for every value of their fact', () => {
    const values = {
      concurrentPositions: [false, true],
      guarantyScope: ['none', 'limited-conduct', 'full-performance'],
      disputeResolution: ['courts', 'arbitration'],
      venueRule: ['merchant-state', 'funder-state'],
    } satisfies Partial<{ [K in keyof McaFacts]: McaFacts[K][] }>;
    const offered = ALL_MCA_CONTENT.filter((clause) => clause.variance?.kind === 'offered');
    expect(offered.length).toBeGreaterThan(0);
    expect(
      [...new Set(offered.map((clause) => clause.variance.kind === 'offered' && clause.variance.fact))].sort(),
    ).toEqual(Object.keys(values).sort());
    for (const [fact, choices] of Object.entries(values)) {
      const group = offered.filter((clause) => clause.variance.kind === 'offered' && clause.variance.fact === fact);
      for (const value of choices) {
        const selected = group.filter((clause) => clause.includeWhen?.({ ...LOMBARD_FACTS, [fact]: value }));
        expect(selected, `${fact}: ${value}`).toHaveLength(1);
      }
    }
  });

  it('lapses approval and review links when either answer changes', () => {
    const clause = ALL_MCA_CONTENT[0];
    const approval = {
      clauseSlug: clause.slug,
      clauseVersion: clause.version,
      instrument: clause.instrument,
      fingerprint: mcaClauseFingerprint(clause),
      approvedByName: 'Review Test',
      approvedByBarNumber: null,
      recordedByUserId: 1,
      barJurisdiction: 'US-FL' as const,
      approvedAt: new Date(),
      notes: null,
    };
    for (const changed of [
      { ...clause, whyThisClause: { kind: 'implements' as const, citation: 'Changed legal basis' } },
      {
        ...clause,
        variance: { kind: 'fixed' as const, because: 'unwritable' as const, note: 'An alternative needs a new input.' },
      },
    ]) {
      expect(isMcaApprovalCurrent(changed, approval)).toBe(false);
      expect(mcaLibraryFingerprint([changed])).not.toBe(mcaLibraryFingerprint([clause]));
    }
  });
});
