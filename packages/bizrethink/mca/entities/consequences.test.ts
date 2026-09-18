import { describe, expect, it } from 'vitest';

import { answerConsequences, documentsThisEntityCanHave } from './consequences';
import { ZMcaEntity } from './entity';
import { entityFixture } from './entity.fixture';

/** Consequences depend on policy alone, so the fixture is parsed down to it. */
const policyOf = (entity: ReturnType<typeof entityFixture>) => ZMcaEntity.parse(entity).policy;

/**
 * WHAT AN ANSWER DOES TO THE DOCUMENTS, derived rather than described.
 *
 * The interview explains each choice by what it changes, and the only way that
 * explanation can be trusted is if it is computed from the same selection the
 * compiler runs. A sentence written by hand drifts the first time a clause's
 * predicate moves, and drifts silently — which in a legal document is the
 * expensive kind.
 *
 * The lease builder's rule applies to the prose around these: they OBSERVE what
 * an answer does, and never recommend one. `suggestions.test.ts` asserts the
 * literal absence of "we recommend"; the same discipline is asserted below.
 */

describe('an answer explains itself by what it changes', () => {
  it('reports the clauses a choice adds and removes, per document', () => {
    const consequences = answerConsequences(policyOf(entityFixture()));
    const arbitration = consequences.find(
      (entry) => entry.field === 'policy.disputeResolution' && entry.option === 'arbitration',
    );

    expect(arbitration).toBeDefined();
    // The fixture chooses courts, so arbitration is the change on offer.
    expect(arbitration?.adds.length).toBeGreaterThan(0);
    expect(arbitration?.removes.length).toBeGreaterThan(0);
  });

  /**
   * The answer already chosen changes nothing, which is what makes the others
   * readable as differences rather than as descriptions.
   */
  it('reports no change for the answer already given', () => {
    const consequences = answerConsequences(policyOf(entityFixture()));
    const courts = consequences.find(
      (entry) => entry.field === 'policy.disputeResolution' && entry.option === 'courts',
    );

    expect(courts).toMatchObject({ adds: [], removes: [], replaces: [], documents: [] });
  });

  /**
   * SOME ANSWERS CHANGE WHICH DOCUMENTS EXIST, not which clauses are in one.
   * Taking business through brokers is the clearest: it does not alter the
   * FRPA, it brings a channel agreement into being.
   */
  it('reports an answer that creates a document rather than editing one', () => {
    const consequences = answerConsequences(policyOf(entityFixture()));
    const broker = consequences.find((entry) => entry.field === 'policy.brokerChannel' && entry.option === 'true');

    expect(broker?.documentsAdded).toEqual(['iso-pra']);
  });

  it('reports an answer that removes a document', () => {
    const offering = entityFixture();

    offering.policy.consumerReportPulled = true;

    const consequences = answerConsequences(policyOf(offering));
    const off = consequences.find((entry) => entry.field === 'policy.consumerReportPulled' && entry.option === 'false');

    expect(off?.documentsRemoved).toEqual(['permission-to-release']);
  });

  /**
   * A CLAUSE SWAPPED FOR ANOTHER DRAFTING OF ITSELF is one change, not two.
   * Both forums are "Venue and Jurisdiction"; reporting that heading as added
   * AND removed reads as nonsense and hides what actually happened.
   */
  it('reports a variant swap as a replacement rather than an add and a remove', () => {
    const consequences = answerConsequences(policyOf(entityFixture()));
    const funderForum = consequences.find(
      (entry) => entry.field === 'policy.venueRule' && entry.option === 'funder-state',
    );

    expect(funderForum?.replaces).toContain('Venue and Jurisdiction');
    expect(funderForum?.adds).not.toContain('Venue and Jurisdiction');
    expect(funderForum?.removes).not.toContain('Venue and Jurisdiction');
  });

  /**
   * Headings, not slugs. The reader is a funder deciding what its paper says,
   * and `frpa.sales-of-receipts-not-a-loan-2-1` is not a sentence anyone reads.
   */
  it('names clauses the way a reader would recognise them', () => {
    const consequences = answerConsequences(policyOf(entityFixture()));
    const changes = consequences.flatMap((entry) => [...entry.adds, ...entry.removes, ...entry.replaces]);

    expect(changes.length).toBeGreaterThan(0);
    expect(changes.every((heading) => !heading.includes('.') || !/^[a-z-]+\.[a-z0-9-]+$/.test(heading))).toBe(true);
  });

  /**
   * A guaranty is the answer with the widest reach, so it is the one worth
   * pinning: it must change something, and it must say which documents.
   */
  it('names the documents an answer reaches, not merely that it reaches some', () => {
    const consequences = answerConsequences(policyOf(entityFixture()));
    const none = consequences.find((entry) => entry.field === 'policy.guarantyScope' && entry.option === 'none');

    expect(none?.documents.length).toBeGreaterThan(0);
    expect(none?.documents.every((instrument) => typeof instrument === 'string')).toBe(true);
  });

  /**
   * THE TWO THAT ARE NOT QUESTIONS. `collectionMethod` and `settlementBase` are
   * `z.literal()` — this release supports one value each. An interview that
   * offered them as choices would be inviting an answer it cannot accept.
   */
  it.each(['policy.collectionMethod', 'policy.settlementBase'])('offers no choice for %s', (field) => {
    expect(answerConsequences(policyOf(entityFixture())).some((entry) => entry.field === field)).toBe(false);
  });

  /**
   * OBSERVATIONS, NEVER RECOMMENDATIONS — the rule `suggestions.test.ts` sets
   * for the lease. These consequences are the raw material the interview shows,
   * so a recommendation smuggled in here would surface as one on the page.
   */
  it('states changes without advising a choice', () => {
    const everything = JSON.stringify(answerConsequences(policyOf(entityFixture()))).toLowerCase();

    for (const advice of ['we recommend', 'you should', 'best practice', 'advisable', 'preferred option']) {
      expect(everything).not.toContain(advice);
    }
  });
});

/**
 * The payoff at the end of the interview: what these answers entitle this
 * entity to have templates for. Derived from the same `instrumentsFor` the
 * compiler uses, so the list cannot promise a document the builder refuses.
 */
describe('what this entity can have templates for', () => {
  it('lists the documents the answers entitle it to', () => {
    expect(documentsThisEntityCanHave(policyOf(entityFixture()))).toEqual(['frpa']);
  });

  it('grows as the programme takes on more', () => {
    const everything = entityFixture();

    everything.policy.equipment = 'merchant-elects';
    everything.policy.brokerChannel = true;
    everything.policy.consumerReportPulled = true;

    expect(documentsThisEntityCanHave(policyOf(everything)).sort()).toEqual([
      'equipment-lease',
      'frpa',
      'iso-pra',
      'permission-to-release',
      'subscription',
    ]);
  });

  /**
   * NEVER THE PROCESSOR'S LETTER. ADR 0019 keeps it supplied fixed and ADR 0026
   * §6 keeps it out of templates, so offering it here would promise a template
   * the builder refuses to compile.
   */
  it('never offers a split funding letter', () => {
    const everything = entityFixture();

    everything.policy.equipment = 'merchant-elects';
    everything.policy.brokerChannel = true;

    expect(documentsThisEntityCanHave(policyOf(everything))).not.toContain('split-funding');
  });
});
