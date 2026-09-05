import { describe, expect, it } from 'vitest';

import { allFields, FL_INTERVIEW } from '../interview/steps';
import { PICANA_FACTS, PICANA_MONEY, PICANA_VALUES } from '../matters/picana-ln';
import { buildLeaseDocuments } from '../render/render-lease';

/**
 * The interview and the Review page count "outstanding" differently, and this
 * field fell into the gap between them.
 *
 * The step rail counts REQUIRED fields that are VISIBLE. The Review page lists
 * `missing` — variables that clauses ACTUALLY SELECTED could not fill. Marking
 * this field required made the rail badge step 7 with a permanent "1" on every
 * lease, while Review stayed silent, because its clause is only selected once a
 * condition report is attached.
 *
 * So a landlord saw a step that would not clear and a Review that never
 * explained why. The fix is to stop asserting it is required up front and let
 * the clause assert it when the clause is real — which is how the delegated pet
 * question already behaves.
 */

const field = () => {
  const found = allFields(FL_INTERVIEW).find((f) => f.name === 'conditionObjectionDays');
  if (!found) {
    throw new Error('conditionObjectionDays is not asked anywhere');
  }
  return found;
};

const missingFor = (over: { hasConditionReport: boolean; conditionObjectionDays?: number | string }) => {
  const { missing } = buildLeaseDocuments({
    facts: { ...PICANA_FACTS, hasConditionReport: over.hasConditionReport },
    money: PICANA_MONEY,
    values: {
      ...PICANA_VALUES,
      conditionReports: '1. Move-in Inspection, dated 6 January 2025 (418 pages)',
      conditionObjectionDays: over.conditionObjectionDays ?? '',
    },
    parties: [],
    propertyAddress: '29090 Picana Lane, Wesley Chapel, FL 33543',
  });

  return missing;
};

describe('conditionObjectionDays', () => {
  it('is not marked required on the step, so an unattached lease is not badged forever', () => {
    expect(field().required).not.toBe(true);
  });

  it('is still asked, because a landlord who attaches a report has to choose the window', () => {
    expect(field().label).toMatch(/report anything/i);
  });

  /*
    The safety net. Optional on the step is only acceptable because the clause
    itself declares the variable required, so the moment a report is attached an
    empty window becomes a blocking finding on Review rather than a silent gap.
  */
  it('becomes outstanding on Review once a condition report is attached', () => {
    expect(missingFor({ hasConditionReport: true }).join(' ')).toContain('conditionObjectionDays');
  });

  it('is answered, and then it is not outstanding', () => {
    expect(missingFor({ hasConditionReport: true, conditionObjectionDays: 7 }).join(' ')).not.toContain(
      'conditionObjectionDays',
    );
  });

  it('is never outstanding while no report is attached', () => {
    expect(missingFor({ hasConditionReport: false }).join(' ')).not.toContain('conditionObjectionDays');
  });
});
