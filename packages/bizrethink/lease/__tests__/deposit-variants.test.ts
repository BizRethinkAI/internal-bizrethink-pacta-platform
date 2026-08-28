import { describe, expect, it } from 'vitest';
import type { ClauseFacts } from '../clauses/types';
import { FL_LIBRARY } from '../clauses/us-fl';
import { selectClauses } from '../engine/select-clauses';
import { PICANA_FACTS } from '../matters/picana-ln';

/**
 * A new tenancy must not carry a sentence explaining that $0.00 was carried
 * forward from a prior one.
 *
 * This is the same defect the Zillow lease had — a fixed template stating every
 * case it knows about and writing "N/A" or "$0.00" against the ones that do not
 * apply, leaving the reader to work out which sentences are real. Carrying a
 * deposit forward is the unusual case, so it gets its own clause rather than a
 * zero-valued phrase in the common one.
 */

const carried: ClauseFacts = { ...PICANA_FACTS, depositCarriedInUsd: 6300, advanceRentCarriedInUsd: 6300 };

const selected = (facts: ClauseFacts) => selectClauses({ facts, library: FL_LIBRARY }).selected.map((c) => c.slug);

describe('a new tenancy', () => {
  it('uses the plain deposit clause', () => {
    expect(selected(PICANA_FACTS)).toContain('deposit.held');
    expect(selected(PICANA_FACTS)).not.toContain('deposit.held-carried');
  });

  it('uses the plain advance rent clause', () => {
    expect(selected(PICANA_FACTS)).toContain('deposit.advance-rent');
    expect(selected(PICANA_FACTS)).not.toContain('deposit.advance-rent-carried');
  });

  it('says nothing about a prior tenancy anywhere in the deposit section', () => {
    const deposit = selectClauses({ facts: PICANA_FACTS, library: FL_LIBRARY }).selected.filter(
      (c) => c.section === 'deposit',
    );

    for (const clause of deposit) {
      expect(clause.body).not.toContain('carried forward');
      expect(clause.body).not.toContain('prior tenancy');
    }
  });
});

describe('a tenancy continuing an earlier one', () => {
  it('swaps in the carried-forward deposit clause', () => {
    expect(selected(carried)).toContain('deposit.held-carried');
    expect(selected(carried)).not.toContain('deposit.held');
  });

  it('swaps in the carried-forward advance rent clause', () => {
    expect(selected(carried)).toContain('deposit.advance-rent-carried');
    expect(selected(carried)).not.toContain('deposit.advance-rent');
  });

  it('records the supersession rather than silently dropping a clause', () => {
    const result = selectClauses({ facts: carried, library: FL_LIBRARY });

    expect(result.superseded).toEqual(
      expect.arrayContaining([
        { slug: 'deposit.held', by: 'deposit.held-carried' },
        { slug: 'deposit.advance-rent', by: 'deposit.advance-rent-carried' },
      ]),
    );
  });

  it('states what was carried in and what is still payable', () => {
    const clause = FL_LIBRARY.find((c) => c.slug === 'deposit.held-carried');

    // The Keane position the 2026 lease could not express: an amount held, an
    // amount carried in, and a separate amount actually due at signing.
    expect(clause?.body).toContain('{{depositHeldUsd}}');
    expect(clause?.body).toContain('{{depositCarriedInUsd}}');
    expect(clause?.body).toContain('{{depositDueAtExecutionUsd}}');
  });
});

describe('either way', () => {
  it('always states where the deposit is held', () => {
    // Fla. Stat. §83.49(2) requires the institution to be named regardless of
    // where the money came from.
    for (const facts of [PICANA_FACTS, carried]) {
      const deposit = selectClauses({ facts, library: FL_LIBRARY }).selected.filter((c) => c.section === 'deposit');

      expect(deposit.some((c) => c.asserts.includes('deposit-location-disclosed'))).toBe(true);
    }
  });

  it('always includes the statutory notice', () => {
    for (const facts of [PICANA_FACTS, carried]) {
      expect(selected(facts)).toContain('deposit.statutory-notice');
    }
  });
});
