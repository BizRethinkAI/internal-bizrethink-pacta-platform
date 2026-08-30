import { describe, expect, it } from 'vitest';

import { allFields, FL_INTERVIEW } from '../interview/steps';
import { applyTenantAnswers, delegableFieldNames, tenantFieldsFor } from '../interview/tenant-answers';

/**
 * Letting the tenant fill in the things only the tenant knows.
 *
 * The names of their children, the breed and weight of their dog, where they
 * live before moving in — a landlord filling these guesses, and then corrects
 * them over email. The lease already goes to the tenant for review, so it can
 * carry the questions with it.
 *
 * THIS IS THE MOST DANGEROUS SURFACE IN THE FEATURE, and these tests exist for
 * that reason. It is an UNAUTHENTICATED endpoint, reached with a link, that
 * writes into a document destined for signature. If it accepted whatever keys
 * it was handed, a tenant — or anyone holding the link — could set the rent.
 *
 * So the whitelist is derived on the SERVER from the field definitions and
 * intersected with what the landlord actually delegated. Client input selects
 * from that set; it never extends it.
 */

const delegable = delegableFieldNames(FL_INTERVIEW);

describe('what may be delegated at all', () => {
  it('offers the fields only a tenant can answer', () => {
    expect(delegable).toContain('authorisedOccupants');
    expect(delegable).toContain('permittedPets');
  });

  it('NEVER offers a money field', () => {
    // A tenant setting the rent, the deposit or their own pet fee is the
    // failure this whole module is shaped around.
    for (const field of allFields(FL_INTERVIEW)) {
      if (field.target === 'money') {
        expect(delegable, `${field.name} is a money field`).not.toContain(field.name);
      }
    }
  });

  it('NEVER offers a field a statute constrains', () => {
    // Notice periods, deposit windows, entry hours. The answer has legal
    // consequence and is the landlord's to give.
    for (const field of allFields(FL_INTERVIEW)) {
      if (field.statute) {
        expect(delegable, `${field.name} carries a statutory bound`).not.toContain(field.name);
      }
    }
  });

  it('never offers a derived value', () => {
    expect(delegable).not.toContain('landlordNames');
    expect(delegable).not.toContain('tenantNames');
  });
});

describe('applyTenantAnswers', () => {
  const values = { authorisedOccupants: null, permittedPets: null, monthlyRentUsd: 6900, venueCounty: 'Pasco' };

  it('writes an answer the landlord delegated', () => {
    const next = applyTenantAnswers({
      values,
      delegated: ['authorisedOccupants'],
      submitted: { authorisedOccupants: 'Ava Shetty, Rohan Shetty' },
    });

    expect(next.authorisedOccupants).toBe('Ava Shetty, Rohan Shetty');
  });

  it('IGNORES a field the landlord did not delegate', () => {
    const next = applyTenantAnswers({
      values,
      delegated: ['authorisedOccupants'],
      submitted: { permittedPets: 'a tiger' },
    });

    expect(next.permittedPets).toBeNull();
  });

  it('IGNORES a field that is not delegable, even if it was somehow delegated', () => {
    // Belt and braces: the stored `delegated` list is server-written, but it
    // is data, and data can be wrong. The field definitions are the authority.
    const next = applyTenantAnswers({
      values,
      delegated: ['monthlyRentUsd', 'venueCounty'],
      submitted: { monthlyRentUsd: 1, venueCounty: 'Nowhere' },
    });

    expect(next.monthlyRentUsd).toBe(6900);
    expect(next.venueCounty).toBe('Pasco');
  });

  it('ignores a key that is not a field at all', () => {
    const next = applyTenantAnswers({
      values,
      delegated: ['authorisedOccupants'],
      submitted: { __proto__: 'x', constructor: 'y', somethingInvented: 'z' } as Record<string, unknown>,
    });

    expect(Object.keys(next).sort()).toEqual(Object.keys(values).sort());
  });

  it('does not mutate what it was given', () => {
    const original = { ...values };

    applyTenantAnswers({ values, delegated: ['authorisedOccupants'], submitted: { authorisedOccupants: 'x' } });

    expect(values).toEqual(original);
  });

  it('trims, and treats an empty answer as no answer', () => {
    const next = applyTenantAnswers({
      values,
      delegated: ['authorisedOccupants'],
      submitted: { authorisedOccupants: '   ' },
    });

    expect(next.authorisedOccupants).toBeNull();
  });

  it('refuses a non-string answer rather than coercing it', () => {
    const next = applyTenantAnswers({
      values,
      delegated: ['authorisedOccupants'],
      submitted: { authorisedOccupants: { evil: true } } as unknown as Record<string, unknown>,
    });

    expect(next.authorisedOccupants).toBeNull();
  });

  it('caps the length, so a link cannot be used to stuff a document', () => {
    const next = applyTenantAnswers({
      values,
      delegated: ['authorisedOccupants'],
      submitted: { authorisedOccupants: 'x'.repeat(50_000) },
    });

    expect(String(next.authorisedOccupants ?? '').length).toBeLessThanOrEqual(2000);
  });
});

describe('tenantFieldsFor', () => {
  it('returns the field definitions to render, in interview order', () => {
    const fields = tenantFieldsFor(FL_INTERVIEW, ['permittedPets', 'authorisedOccupants']);

    expect(fields.map((f) => f.name)).toEqual(['authorisedOccupants', 'permittedPets']);
  });

  it('drops anything not delegable, so a bad stored list cannot render a rent box', () => {
    expect(tenantFieldsFor(FL_INTERVIEW, ['monthlyRentUsd'])).toEqual([]);
  });

  it('is empty when nothing was delegated', () => {
    expect(tenantFieldsFor(FL_INTERVIEW, [])).toEqual([]);
  });
});
