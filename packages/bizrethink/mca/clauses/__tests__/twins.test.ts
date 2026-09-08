import { describe, expect, it } from 'vitest';

import { readAgreementBody } from '../documents';
import { INSTRUMENTS } from '../instruments';
import { libraryFor } from '../library';
import { applyTwinVocabulary, EQUIPMENT_TWIN, TWIN_VOCABULARY, twinDivergence } from '../twins';

/**
 * The Equipment Lease and the Subscription Agreement are the same document with
 * its vocabulary swapped, and REVIEW-02 named the consequence:
 *
 *   > Every Equipment Lease finding in this review therefore lands twice, in
 *   > two live templates, and a fix applied to one and not the other is a
 *   > divergence nothing checks for.
 *
 * This file is the something that checks for it.
 *
 * WHY THE TWO ARE NOT ONE CLAUSE WITH TWO RENDERINGS, WHICH WAS THE FIRST
 * DESIGN. The plan was to hold one body and derive the other through a lexicon,
 * so that divergence would be impossible rather than merely detectable. The
 * documents refuse it. In §3.2 alone, `leased` becomes `you subscribe for` in
 * one sentence and `subscribed for` in the next — the same source phrase, two
 * different targets, inside one clause. A substitution table with per-clause
 * exceptions is not a substitution table, and pretending the relationship is
 * mechanical would mean the library asserting words no document contains.
 *
 * So both documents' clauses are stored, and the relationship between them is
 * ASSERTED rather than generated. The vocabulary below is a checking aid, never
 * a rendering one, and `applyTwinVocabulary` is called by tests and by nothing
 * that produces text for a reader.
 */
describe('the Equipment Lease and the Subscription cannot diverge unnoticed', () => {
  const lease = libraryFor('equipment-lease');
  const subscription = libraryFor('subscription');

  /**
   * THE CHECK THAT MATTERS MOST, AND THE CHEAPEST ONE.
   *
   * A clause added to one document and not the other is the likeliest form the
   * divergence takes, and it needs no text comparison to catch.
   */
  it('numbers its clauses identically', () => {
    expect(lease.map((clause) => clause.number).sort()).toEqual(subscription.map((clause) => clause.number).sort());

    expect(lease).toHaveLength(26);
  });

  it('pairs every clause with its twin', () => {
    for (const clause of lease) {
      expect(
        subscription.find((twin) => twin.number === clause.number),
        `Equipment Lease ${clause.number} has no twin`,
      ).toBeDefined();
    }
  });

  /**
   * Every clause the divergence register does NOT name must agree once the
   * vocabulary is applied. This is the assertion that goes red when somebody
   * fixes one document and forgets the other.
   */
  it('agrees word for word on every clause not declared divergent', () => {
    for (const clause of lease) {
      if (twinDivergence(clause.number) !== null) {
        continue;
      }

      const twin = subscription.find((other) => other.number === clause.number);

      expect(applyTwinVocabulary(clause.heading), `heading ${clause.number}`).toBe(twin?.heading);
      expect(applyTwinVocabulary(clause.body), `body ${clause.number}`).toBe(twin?.body);
    }
  });

  /**
   * A declared divergence must actually diverge.
   *
   * Without this the register is write-only: a divergence resolved in the
   * documents would sit in the list for ever, and the list is what a reader
   * consults to learn what the two documents genuinely differ about.
   */
  it('declares nothing that has stopped being different', () => {
    for (const clause of lease) {
      const divergence = twinDivergence(clause.number);

      if (divergence === null) {
        continue;
      }

      const twin = subscription.find((other) => other.number === clause.number);

      expect(
        applyTwinVocabulary(clause.heading) !== twin?.heading || applyTwinVocabulary(clause.body) !== twin?.body,
        `${clause.number} is declared divergent but the two documents now agree`,
      ).toBe(true);
    }
  });

  it('gives a reason for every divergence, and names the five', () => {
    expect(EQUIPMENT_TWIN.divergent.map((entry) => entry.number)).toEqual(['3.4', '3.5', '3.6', '3.7', '3.8']);

    for (const entry of EQUIPMENT_TWIN.divergent) {
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  /**
   * FOUR OF THE FIVE DIVERGENCES ARE ONE FACT.
   *
   * Title can pass to the customer under the Equipment Lease and cannot under
   * the Subscription, so §3.5's "until title passes", §3.6's characterisation,
   * §3.7's purchase option and §3.8's perpetual licence all follow from it.
   * Asserted so that a sixth divergence has to be justified rather than added
   * to a list nobody reads.
   */
  it('traces four of the five to title, and the fifth to collection', () => {
    const byCause = EQUIPMENT_TWIN.divergent.reduce<Record<string, string[]>>((acc, entry) => {
      acc[entry.cause] = [...(acc[entry.cause] ?? []), entry.number];

      return acc;
    }, {});

    expect(byCause).toEqual({
      title: ['3.5', '3.6', '3.7', '3.8'],
      collection: ['3.4'],
    });
  });

  /**
   * Dead vocabulary is a quiet lie: an entry that never fires reads as evidence
   * the two documents use a word they do not, and would survive the word being
   * removed from both.
   */
  it('has no vocabulary entry that never applies', () => {
    const leaseText = readAgreementBody(INSTRUMENTS['equipment-lease'].sourceDocument);

    for (const [from] of TWIN_VOCABULARY) {
      expect(leaseText.includes(from), `vocabulary entry never appears in the document: ${from}`).toBe(true);
    }
  });
});
