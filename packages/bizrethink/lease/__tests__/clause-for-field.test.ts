import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';
import { selectClauses } from '../engine/select-clauses';
import { clauseIndexForFields } from '../interview/clause-for-field';
import { PICANA_FACTS } from '../matters/picana-ln';

/**
 * The interview asks sixty questions and never says what any of them becomes.
 * A landlord typing a figure into "what do you charge if the tenant refuses
 * access" has no way to know it lands in 8.7 Administrative Charges, so the
 * question reads as a form field rather than as a term they are drafting.
 */

const index = clauseIndexForFields(selectClauses({ facts: PICANA_FACTS, library: FL_LIBRARY }).selected);

describe('clauseIndexForFields', () => {
  it('names the clause an answer ends up in', () => {
    const ref = index.get('inspectionRefusalFeeUsd');

    expect(ref?.heading).toBe('Administrative Charges');
    expect(ref?.number).toMatch(/^\d+(\.\d+)?$/);
  });

  it('covers the money questions a landlord is most unsure about', () => {
    for (const field of ['lateFeeUsd', 'graceDays', 'returnedPaymentFeeUsd', 'lockoutFeeUsd']) {
      expect(index.get(field), field).toBeDefined();
    }
  });

  /*
    Numbering is derived from what survives selection, so the reference has to
    come from the SELECTED clauses. Reading it off the whole library would
    point a landlord at a number their lease does not contain.
  */
  it('is empty for a clause this lease does not include', () => {
    const noPets = clauseIndexForFields(
      selectClauses({ facts: { ...PICANA_FACTS, petsPermitted: false }, library: FL_LIBRARY }).selected,
    );

    expect(noPets.get('permittedPets')).toBeUndefined();
  });

  /*
    First wins. `tenantNames` appears in the recital and again in the occupancy
    clause; naming both would be noise where naming the earliest is a pointer.
  */
  it('points at the first place an answer appears', () => {
    const ref = index.get('tenantNames');

    expect(ref).toBeDefined();
    expect(Number(ref?.number.split('.')[0])).toBeLessThan(5);
  });

  it('has no entry for a name no clause interpolates', () => {
    expect(index.get('notAVariableAnywhere')).toBeUndefined();
  });
});

/**
 * The rail replaced the chip row, and the reference is shown.
 *
 * Thirteen chips wrapping over two rows told a landlord where they were and
 * nothing else — not which steps were finished, not which still wanted them.
 * And sixty questions never said what any of them became.
 *
 * Source-level because both are rendering, and the failure mode is a page
 * going quiet rather than anything throwing.
 */
describe('the builder shows its state', () => {
  const route = readFileSync(
    new URL('../../../../apps/remix/app/routes/_authenticated+/t.$teamUrl+/leases.$id.tsx', import.meta.url),
    'utf8',
  );

  it('counts what is outstanding on every step, not just the current one', () => {
    expect(route).toMatch(/const outstandingOn = /);
    expect(route).toMatch(/outstandingOn\(s\)/);
  });

  it('tells each question which clause it becomes', () => {
    expect(route).toContain('clauseIndexForFields');
    expect(route).toContain('clause={clauseFor.get(field.name)}');
  });

  /*
    Recomputed from the current answers, never read off the library once — a
    clause dropped earlier renumbers everything after it, so a cached reference
    would point at a number the lease does not contain.
  */
  it('derives the numbering from the selected clauses', () => {
    expect(route).toMatch(/clauseIndexForFields\(selectClauses\(/);
  });

  it('still lets every step be reached out of order', () => {
    expect(route).toMatch(/onClick=\{\(\) => void goTo\(i\)\}/);
  });
});
