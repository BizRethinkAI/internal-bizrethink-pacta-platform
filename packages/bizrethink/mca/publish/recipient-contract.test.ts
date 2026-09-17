import { describe, expect, it } from 'vitest';

import { contentFor } from '../catalogue';
import type { McaInstrument } from '../clauses/instruments';
import contract from './live-template-contract.json';
import { PRODUCED_INSTRUMENTS, RECIPIENTS } from './recipient-contract';

/**
 * Who signs each document, and under what name the funder's platform addresses
 * them.
 *
 * THIS HALF OF THE CONTRACT FAILS LOUDLY, which is the one mercy in it. A send
 * names recipients by **role key** — `{ merchant: {...}, guarantor: {...} }` —
 * and `sendDocument` throws `recipient "x" expected by template but not
 * provided` when a key it expects is missing. Compare the widget names in
 * `template-parity.ts`, where a rename is a silent blank. Both are interfaces
 * this repository does not deploy; only one of them shouts.
 *
 * The role key is load-bearing in the other direction too: the platform reads
 * `recipientTokens.merchant` and `signingUrls.merchant` back out by the same
 * key.
 *
 * WHAT IS NOT A CONTRACT: the numeric recipient ids. `/template/use` takes
 * `{ id, email, name }` where the id is the template recipient's own, captured
 * at publication. A template the builder publishes has new ids, and the record
 * carrying them has to be updated — which is ADR 0023 §2's whole point. Order
 * and role are properties of the template, inherited by every send, so the
 * builder sets them once when it publishes.
 */

const signatureBindings = (instrument: McaInstrument): string[] => {
  const found = new Set<string>();

  for (const entry of contentFor(instrument)) {
    for (const field of entry.fields ?? []) {
      if (field.binding.endsWith('.signature')) {
        found.add(field.binding);
      }
    }
  }

  return [...found].sort();
};

const carries = (instrument: McaInstrument, binding: string): boolean =>
  contentFor(instrument).some((entry) => (entry.fields ?? []).some((field) => field.binding === binding));

describe('the parties a published template expects', () => {
  it.each(PRODUCED_INSTRUMENTS)('%s names the roles the live template names, in order', (instrument) => {
    const live = contract.instruments[instrument].recipients;

    expect(RECIPIENTS[instrument].map((party) => party.role)).toEqual(live.map((party) => party.role));
    expect(RECIPIENTS[instrument].map((party) => party.signingOrder)).toEqual(live.map((party) => party.signingOrder));
  });

  it.each(PRODUCED_INSTRUMENTS)('%s gives every party somewhere to sign and date', (instrument) => {
    const missing = RECIPIENTS[instrument]
      .flatMap((party) => [`${party.signs}.signature`, `${party.signs}.signedDate`])
      .filter((binding) => !carries(instrument, binding));

    expect(missing).toEqual([]);
  });

  /**
   * The failure this catches is a signature block for a party who is not a
   * recipient — a document that cannot complete, because nobody is ever asked
   * to sign there — or a recipient with nowhere to sign, which completes
   * without the signature it was sent for. Both are only visible by comparing
   * the two lists, so the test compares them.
   */
  it.each(
    PRODUCED_INSTRUMENTS,
  )('%s has no signature block without a signer, and no signer without one', (instrument) => {
    const claimed = RECIPIENTS[instrument].map((party) => `${party.signs}.signature`).sort();

    expect(signatureBindings(instrument)).toEqual(claimed);
  });

  /**
   * ADR 0019. The split funding letter is the processor's, so the builder
   * publishes no template for it and claims none of its recipients — the live
   * record is kept in the JSON as the description of somebody else's document.
   */
  it('produces no split funding letter, and says so by omission', () => {
    expect(PRODUCED_INSTRUMENTS).not.toContain('split-funding');
    expect(RECIPIENTS).not.toHaveProperty('split-funding');
    expect(signatureBindings('split-funding')).toEqual([]);
    expect(contract.instruments['split-funding'].recipients).toHaveLength(1);
  });

  /**
   * A guarantor signs in a separate legal capacity, so they are their own
   * recipient with their own token and audit trail even when the platform
   * sends both rows to one address. A model that folded them into the merchant
   * would lose the separate guaranty this library is careful to keep distinct.
   */
  it('keeps the guarantor a recipient in their own right wherever one signs', () => {
    const withGuarantor = PRODUCED_INSTRUMENTS.filter((instrument) =>
      RECIPIENTS[instrument].some((party) => party.role === 'guarantor'),
    );

    expect(withGuarantor).toEqual(['frpa', 'equipment-lease', 'subscription', 'permission-to-release']);

    for (const instrument of withGuarantor) {
      const guarantor = RECIPIENTS[instrument].find((party) => party.role === 'guarantor');
      const merchant = RECIPIENTS[instrument].find((party) => party.signingOrder === 1);

      expect(guarantor?.signs).not.toBe(merchant?.signs);
    }
  });
});
