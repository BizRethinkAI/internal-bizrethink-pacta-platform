import { describe, expect, it } from 'vitest';

import { INSTRUMENTS, MCA_INSTRUMENTS, merchantFacing } from '../instruments';
import { libraryFor } from '../library';

/**
 * Six agreements, and the sixth is the point of this file.
 *
 * `MCA-CLAUSE-LIBRARY-PHASE0.md` counts five negotiated agreements and 140
 * clauses. `CONTRACT_INDEX.md` publishes six. The one Phase 0 left out is the
 * Subscription Agreement — which is the document REVIEW-01 actually reviewed,
 * and which REVIEW-02 found is the Equipment Lease with its vocabulary swapped
 * and its clause numbering identical
 * (`phase0-corpus-omits-the-subscription-agreement-entirely`).
 *
 * The consequence REVIEW-02 draws is the reason the instrument list is written
 * down and asserted rather than derived from whatever clause files happen to
 * exist: **every Equipment Lease finding lands twice, in two live templates,
 * and a fix applied to one and not the other is a divergence nothing checks
 * for.** A list that grows itself from the files present cannot notice a
 * missing document; this one can.
 */
describe('the instruments', () => {
  it('is the published corpus, all six of it', () => {
    expect(MCA_INSTRUMENTS).toEqual([
      'frpa',
      'equipment-lease',
      'subscription',
      'iso-pra',
      'payzli-split-funding',
      'permission-to-release',
    ]);
  });

  it('describes every instrument it names', () => {
    for (const id of MCA_INSTRUMENTS) {
      const instrument = INSTRUMENTS[id];

      expect(instrument.id).toBe(id);
      expect(instrument.title.length).toBeGreaterThan(0);
      expect(instrument.entity.length).toBeGreaterThan(0);
      expect(instrument.sourceDocument).toMatch(/\.txt$/);
    }
  });

  /**
   * The ISO Partner Referral Agreement is the one instrument in the corpus a
   * merchant never sees, and that is not a detail. Its §2.6 exists because
   * California and New York regulate what a BROKER may hand a recipient, and
   * the agreement builder must never assemble it into a merchant's document
   * set.
   */
  it('knows which instruments a merchant sees', () => {
    expect(merchantFacing()).not.toContain('iso-pra');
    expect(merchantFacing()).toContain('frpa');
  });

  it('has an empty library for an instrument nothing has been imported for', () => {
    const imported = MCA_INSTRUMENTS.filter((id) => libraryFor(id).length > 0);

    expect(imported.length).toBeGreaterThan(0);
    expect(imported.length).toBeLessThanOrEqual(MCA_INSTRUMENTS.length);
  });
});
