import { describe, expect, it } from 'vitest';

import { numberClauses } from '../../engine/number-clauses';
import { numberedLibraryForReview } from '../../review/numbered-library';
import { MCA_INSTRUMENTS } from '../instruments';
import { ALL_MCA_CLAUSES, libraryFor } from '../library';

describe('the MCA clause catalogue contains only numbered operative provisions', () => {
  it('never registers a field group or explainer as a clause', () => {
    expect(ALL_MCA_CLAUSES.filter((entry) => entry.kind !== 'clause').map((entry) => entry.slug)).toEqual([]);
  });

  it('has no escape allowing an unnumbered clause', () => {
    expect(ALL_MCA_CLAUSES.filter((entry) => 'unnumberedReason' in entry).map((entry) => entry.slug)).toEqual([]);
  });

  it.each(MCA_INSTRUMENTS)('%s presents every clause with a citation in its stated review context', (instrument) => {
    const rows = numberedLibraryForReview(instrument);
    expect(rows.length).toBe(libraryFor(instrument).length);
    expect(rows.every((row) => /^\d+\.\d+$/.test(row.number))).toBe(true);
  });

  it('never allows a reusable block to consume a clause number at runtime', () => {
    const forged = { ...ALL_MCA_CLAUSES[0], kind: 'field-group' };
    // Exercise the runtime boundary even when a caller has escaped TypeScript.
    expect(() => numberClauses([forged as (typeof ALL_MCA_CLAUSES)[number]])).toThrow(/clause/i);
  });
});
