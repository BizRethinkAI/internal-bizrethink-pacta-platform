import { describe, expect, it } from 'vitest';
import { PICANA_FACTS, PICANA_MONEY, PICANA_VALUES } from '../matters/picana-ln';
import type { LeasePartyInput } from '../parties/derive-parties';
import { derivePartyValues } from '../parties/derive-parties';
import { buildLeaseDocuments } from '../render/render-lease';

/**
 * The §83.505 electronic-notice addendum, with more than one tenant.
 *
 * THE BUG THIS GUARDS. The addendum used to interpolate a single
 * `{{tenantNoticeEmail}}`, filled from one hand-typed interview question. The
 * statute requires a valid email address for EACH party. With two tenants the
 * addendum named one of them and the second had elected nothing at all — and
 * the document rendered perfectly, because one field had one value.
 *
 * Asserted end to end rather than on the derivation alone: the derivation
 * being right is worth nothing if the clause interpolates something else.
 */

const parties: LeasePartyInput[] = [
  { name: 'Shwet Prabhat', role: 'landlord', email: 'shwet@example.com' },
  { name: 'Harsha Shetty', role: 'tenant', email: 'harsha@example.com' },
  { name: 'Second Tenant', role: 'tenant', email: 'second@example.com' },
];

const addendum = () => {
  const { documents } = buildLeaseDocuments({
    facts: { ...PICANA_FACTS, electronicNoticesElected: true },
    money: PICANA_MONEY,
    values: { ...PICANA_VALUES, ...derivePartyValues(parties) },
    parties: parties.map((p) => ({ name: p.name, role: p.role })),
    propertyAddress: '29090 Picana Lane, Wesley Chapel, FL 33543',
  });

  return documents
    .flatMap((doc) => doc.clauses)
    .find((rendered) => rendered.clause.slug === 'notices.electronic-delivery');
};

describe('the §83.505 addendum names every party', () => {
  it('is produced when the election is made', () => {
    expect(addendum()).toBeDefined();
  });

  it('names BOTH tenants and both addresses', () => {
    const body = addendum()?.text ?? '';

    expect(body).toContain('harsha@example.com');
    expect(body, 'the second tenant was left out — the original defect').toContain('second@example.com');
  });

  it('names the landlord and their address', () => {
    expect(addendum()?.text ?? '').toContain('shwet@example.com');
  });

  it('leaves no unfilled token behind', () => {
    // A raw {{token}} in front of a signer is the failure the renderer exists
    // to prevent; a renamed variable is exactly how one appears.
    expect(addendum()?.text ?? '').not.toMatch(/\{\{/);
  });

  it('is omitted entirely when the election is not made', () => {
    const { documents } = buildLeaseDocuments({
      facts: { ...PICANA_FACTS, electronicNoticesElected: false },
      money: PICANA_MONEY,
      values: { ...PICANA_VALUES, ...derivePartyValues(parties) },
      parties: parties.map((p) => ({ name: p.name, role: p.role })),
      propertyAddress: '29090 Picana Lane, Wesley Chapel, FL 33543',
    });

    const found = documents
      .flatMap((doc) => doc.clauses)
      .find((rendered) => rendered.clause.slug === 'notices.electronic-delivery');

    expect(found).toBeUndefined();
  });
});
