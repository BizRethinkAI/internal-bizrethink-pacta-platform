import { describe, expect, it } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_VALUES } from '../matters/picana-ln';
import type { LeasePartyInput } from '../parties/derive-parties';
import { derivePartyValues } from '../parties/derive-parties';
import { buildLeaseDocuments } from '../render/render-lease';

/**
 * Who may live in the property.
 *
 * TWO DEFECTS, FOUND BY USING IT. The clause read "The following people are
 * authorised to occupy the Premises: {{authorisedOccupants}}", filled from one
 * free-text question.
 *
 *   1. IT OMITTED THE TENANTS. Answer "daughters and father" and the lease
 *      says those are the people authorised to occupy — leaving the signing
 *      tenant, the person actually renting it, off the list of people allowed
 *      to live there.
 *
 *   2. IT INVITED RELATIONSHIPS INSTEAD OF NAMES. "daughters and father"
 *      identifies nobody. An occupancy clause that names no one cannot do the
 *      job it exists for, and the field was required, so a lease with no
 *      additional occupants forced the answerer to invent something.
 *
 * The tenants are now always named, from the party list. Naming anyone else is
 * optional, and the clause has a variant for each case rather than printing a
 * trailing "together with ." when nobody was added.
 */

const parties: LeasePartyInput[] = [
  { name: 'Shwet Prabhat', role: 'landlord', email: 'shwet@example.com' },
  { name: 'Harsha Shetty', role: 'tenant', email: 'harsha@example.com' },
];

const occupancyText = (authorisedOccupants: string | null) => {
  const { documents } = buildLeaseDocuments({
    facts: { ...PICANA_FACTS, hasNamedOccupants: Boolean(authorisedOccupants?.trim()) },
    money: PICANA_MONEY,
    values: { ...PICANA_VALUES, ...derivePartyValues(parties), authorisedOccupants },
    parties: parties.map((p) => ({ name: p.name, role: p.role })),
    propertyAddress: '29090 Picana Lane, Wesley Chapel, FL 33543',
  });

  const found = documents
    .flatMap((doc) => doc.clauses)
    .find((rendered) => rendered.clause.slug.startsWith('use.occupancy-limit'));

  return found?.text ?? '';
};

describe('the tenants are always named as occupants', () => {
  it('names the tenant when nobody else was added', () => {
    const text = occupancyText(null);

    expect(text, 'the tenant was left off the list of people allowed to live there').toContain('Harsha Shetty');
  });

  it('names the tenant when others were added too', () => {
    expect(occupancyText('Ava Shetty, Rohan Shetty')).toContain('Harsha Shetty');
  });

  it('names the additional occupants alongside them', () => {
    const text = occupancyText('Ava Shetty, Rohan Shetty');

    expect(text).toContain('Ava Shetty');
    expect(text).toContain('Rohan Shetty');
  });
});

describe('a lease with no additional occupants', () => {
  it('produces a clause at all — the field is no longer required', () => {
    expect(occupancyText(null)).not.toBe('');
  });

  it('does not print a dangling "together with"', () => {
    // The failure a single clause with an optional variable would produce.
    expect(occupancyText(null).toLowerCase()).not.toContain('together with');
  });

  it('leaves no unfilled token behind', () => {
    expect(occupancyText(null)).not.toMatch(/\{\{/);
    expect(occupancyText('Ava Shetty')).not.toMatch(/\{\{/);
  });
});

describe('only one occupancy clause is ever selected', () => {
  it('does not print both variants at once', () => {
    for (const answer of [null, 'Ava Shetty']) {
      const { documents } = buildLeaseDocuments({
        facts: { ...PICANA_FACTS, hasNamedOccupants: Boolean(answer) },
        money: PICANA_MONEY,
        values: { ...PICANA_VALUES, ...derivePartyValues(parties), authorisedOccupants: answer },
        parties: parties.map((p) => ({ name: p.name, role: p.role })),
        propertyAddress: 'x',
      });

      const matches = documents
        .flatMap((doc) => doc.clauses)
        .filter((rendered) => rendered.clause.slug.startsWith('use.occupancy-limit'));

      expect(matches, `two occupancy clauses for answer ${String(answer)}`).toHaveLength(1);
    }
  });
});
