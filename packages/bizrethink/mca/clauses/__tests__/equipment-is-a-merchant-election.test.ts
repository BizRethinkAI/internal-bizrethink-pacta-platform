import { describe, expect, it } from 'vitest';

import { LOMBARD_FACTS, type McaFacts } from '../facts';
import { libraryFor } from '../library';

/**
 * **Equipment is elected by the merchant at signing, not fixed by the funder.**
 *
 * Owner's decision, 2026-09-10: *"Lease or buy, merchant decide while signing
 * up."* That answers a question the fact row had been answering wrongly.
 *
 * `equipment` was `'none' | 'purchased-at-funding' | 'deferred' | 'separate-lease'`
 * — four values describing which equipment model the FUNDER runs. Three of them
 * were indistinguishable in practice, because every gate in the corpus is
 * `equipment !== 'none'`; the distinction was never read. And one of them,
 * `'deferred'`, stopped having any clause text behind it when §§002/003 were
 * rewritten: §2.6 says the Remaining Balance never includes an equipment
 * charge, so a Purchased Amount of `(Purchase Price × Factor Rate) + Equipment
 * Cost Deferred` puts one inside it by construction.
 *
 * What the funder decides is whether equipment is part of the offering at all.
 * Buy-versus-lease is the merchant's, made in Section 1 before signature, and
 * §002 already reads that way.
 *
 * The reason this is a test and not a comment: an `McaFacts` value that nothing
 * reads and no clause implements is indistinguishable from a value that works,
 * right up until a template is assembled from it. `guarantyScope` and
 * `settlementBase` were both found the same way.
 */
describe('equipment is a merchant election, not a funder fact', () => {
  const frpa = libraryFor('frpa');
  const body = (slug: string) => {
    const clause = frpa.find((c) => c.slug === slug);
    if (!clause) {
      throw new Error(`no clause ${slug}`);
    }
    return clause.body;
  };

  /**
   * The union carries exactly the funder-level choice and nothing else. A value
   * that describes which model the merchant picked does not belong here; if one
   * reappears, the fact has drifted back into deciding something it does not
   * decide.
   */
  it('offers the funder one decision: equipment or no equipment', () => {
    const permitted: McaFacts['equipment'][] = ['none', 'merchant-elects'];

    // Typed exhaustively: adding a value to the union without a gate that reads
    // it makes this fail to compile rather than pass silently.
    const witness: Record<McaFacts['equipment'], true> = {
      none: true,
      'merchant-elects': true,
    };

    expect(Object.keys(witness).sort()).toEqual([...permitted].sort());
  });

  /**
   * `'deferred'` is gone as a value because it is gone as a mechanism. The
   * corpus must not describe one either — a body that adds an equipment amount
   * to the Purchased Amount contradicts §2.6 whatever the fact says.
   */
  it('adds no equipment charge to the Purchased Amount anywhere in the corpus', () => {
    const offenders = frpa
      .filter((clause) =>
        /\+\s*Equipment Cost|Equipment Cost Deferred(?!”? in Section 1\.3 is stated as \$0\.00)/i.test(clause.body),
      )
      .filter((clause) => !/is stated as \$0\.00/.test(clause.body))
      .map((clause) => clause.slug);

    expect(offenders).toEqual([]);
  });

  /** Both paths are offered to the merchant, in the clause that explains them. */
  it('offers the merchant both buy and lease in §002', () => {
    const equipmentCost = body('frpa.equipment-cost-explainer');

    expect(equipmentCost).toMatch(/If Merchant elects to buy the equipment for cash/);
    expect(equipmentCost).toMatch(/If Merchant instead leases or subscribes for the equipment/);
    expect(equipmentCost).toMatch(/Merchant does not pay for the same equipment twice/);
  });

  /**
   * The election is recorded before signature, not after. An election made
   * later is an amendment, and an unpriced amendment is how an equipment charge
   * gets back into a Purchased Amount that has already been disclosed.
   */
  it('fixes the election in Section 1 before Merchant signs', () => {
    const equipmentCost = body('frpa.equipment-cost-explainer');

    expect(equipmentCost).toMatch(/itemized deduction from the Purchase Price/);
    expect(equipmentCost).toMatch(
      /in (?:Section 1\.4|the Itemization of Net Amount Funded grid) before Merchant signs/,
    );
  });

  /**
   * Lombard offers equipment. That is the only thing its profile now asserts
   * about it, and it is the thing the four gates in the corpus actually read.
   */
  it('reads Lombard as a funder that offers equipment', () => {
    expect(LOMBARD_FACTS.equipment).toBe('merchant-elects');
    expect(LOMBARD_FACTS.equipment).not.toBe('none');
  });
});
