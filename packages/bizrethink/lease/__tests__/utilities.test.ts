import { describe, expect, it } from 'vitest';

import { allFields, DERIVED_VALUES, FL_INTERVIEW } from '../interview/steps';
import type { UtilityRow } from '../utilities/derive-utilities';
import { renderUtilityList, splitByPayer } from '../utilities/derive-utilities';

/**
 * Who arranges which utility, and who to ring about it.
 *
 * This was two free-text boxes, and a real answer went in as a numbered list
 * with company names and phone numbers hand-typed. All of it is PROPERTY data
 * — the electric co-op and the trash contractor at 29090 Picana Ln are the
 * same for every tenancy — so it was being retyped every lease, and the
 * tenant-paid and landlord-paid lists could drift apart with nothing to notice.
 *
 * Structured on the property, rendered into prose here. The clause reads
 * "Tenant shall arrange and pay for the following directly with the supplier:
 * {{tenantUtilities}}", so a numbered list would render as one run-on line
 * inside a sentence. Prose with a serial comma is what that sentence wants,
 * and it matches how the party names already read.
 */

const rows: UtilityRow[] = [
  {
    service: 'electricity',
    provider: 'Withlacoochee River Electric Cooperative',
    phone: '352-588-5115',
    paidBy: 'tenant',
  },
  { service: 'water and sewer', provider: 'Pasco County Utilities', phone: '', paidBy: 'tenant' },
  { service: 'trash collection', provider: 'Coastal', phone: '800-255-7172', paidBy: 'landlord' },
];

describe('renderUtilityList', () => {
  it('names the service, the provider and the number', () => {
    expect(renderUtilityList([rows[0]])).toBe('electricity (Withlacoochee River Electric Cooperative, 352-588-5115)');
  });

  it('omits the number when there is not one, rather than printing an empty bracket', () => {
    expect(renderUtilityList([rows[1]])).toBe('water and sewer (Pasco County Utilities)');
  });

  it('names the service alone when there is no provider either', () => {
    expect(renderUtilityList([{ service: 'internet', provider: '', phone: '', paidBy: 'tenant' }])).toBe('internet');
  });

  it('joins two with "and"', () => {
    expect(renderUtilityList(rows.slice(0, 2))).toBe(
      'electricity (Withlacoochee River Electric Cooperative, 352-588-5115) and water and sewer (Pasco County Utilities)',
    );
  });

  it('uses the serial comma for three, as the party list does', () => {
    const three = [...rows.slice(0, 2), { service: 'gas', provider: '', phone: '', paidBy: 'tenant' as const }];

    expect(renderUtilityList(three)).toMatch(/\), and gas$/);
  });

  it('returns "none" for an empty list, because the clause interpolates it mid-sentence', () => {
    // "Landlord shall provide and pay for: ." would be the alternative.
    expect(renderUtilityList([])).toBe('none');
  });

  it('trims stray whitespace rather than rendering it into a lease', () => {
    expect(renderUtilityList([{ service: '  gas  ', provider: '  TECO  ', phone: '', paidBy: 'tenant' }])).toBe(
      'gas (TECO)',
    );
  });

  it('drops a row with no service at all', () => {
    expect(renderUtilityList([{ service: '   ', provider: 'Someone', phone: '', paidBy: 'tenant' }])).toBe('none');
  });
});

describe('splitByPayer', () => {
  it('separates the two lists from one source, so they cannot drift', () => {
    const { tenant, landlord } = splitByPayer(rows);

    expect(tenant).toContain('electricity');
    expect(tenant).toContain('water and sewer');
    expect(tenant).not.toContain('trash');

    expect(landlord).toContain('trash collection');
    expect(landlord).not.toContain('electricity');
  });

  it('says "none" on whichever side is empty', () => {
    const { tenant, landlord } = splitByPayer([rows[2]]);

    expect(tenant).toBe('none');
    expect(landlord).toContain('trash collection');
  });

  it('preserves the order they were entered in', () => {
    expect(splitByPayer(rows).tenant.indexOf('electricity')).toBeLessThan(splitByPayer(rows).tenant.indexOf('water'));
  });

  it('handles a property recorded before utilities existed', () => {
    expect(splitByPayer([])).toEqual({ tenant: 'none', landlord: 'none' });
  });
});

/**
 * The interview must not ask for what the property already answers.
 *
 * Two free-text boxes — "Which utilities does the tenant arrange and pay for?"
 * and "Which do you provide?" — sat on step 4 and were `required`. They were
 * the pre-rows design, and after the rows landed they were two ways to state
 * the same fact, in a document whose entire reason for existing is that a
 * lease must not contradict itself.
 */
describe('utilities are not asked twice', () => {
  it('are derived, not questions', () => {
    const asked = allFields(FL_INTERVIEW).map((field) => field.name);

    expect(asked).not.toContain('tenantUtilities');
    expect(asked).not.toContain('landlordUtilities');
  });

  it('are declared derived, so the coverage test knows the clause is still filled', () => {
    expect(DERIVED_VALUES).toContain('tenantUtilities');
    expect(DERIVED_VALUES).toContain('landlordUtilities');
  });
});
