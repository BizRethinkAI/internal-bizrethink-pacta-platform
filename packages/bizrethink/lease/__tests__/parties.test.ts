import { describe, expect, it } from 'vitest';
import type { LeasePartyInput } from '../parties/derive-parties';
import { derivePartyValues, partyEmails, toLeaseParties, validateParties } from '../parties/derive-parties';

/**
 * The party list, and why it is its own module.
 *
 * `landlordNames` and `tenantNames` are REQUIRED variables on the very first
 * clause of the lease — the sentence naming who is agreeing to what. They sit
 * in DERIVED_VALUES, meaning nobody types them, which left them derived from
 * nothing: the only place they were ever set was a hardcoded fixture. In the
 * running app they were permanently unfilled, `readyToSend` was therefore
 * permanently false, and the lease could not be sent at all.
 *
 * The other half of this module's job is an invariant that is quiet when it
 * breaks. `createEnvelopeFromMatter` takes emails as `Record<name, email>`,
 * so two parties sharing a name collapse into one entry and one of them
 * silently receives the other's signing link — a lease countersigned by the
 * wrong person, with no error anywhere. Names must therefore be unique, and
 * that is checked here rather than trusted.
 */

const TWO_LANDLORDS_TWO_TENANTS: LeasePartyInput[] = [
  { name: 'Shwet Prabhat', role: 'landlord', email: 'shwet@example.com' },
  { name: 'Ambika Prabhat', role: 'landlord', email: 'ambika@example.com' },
  { name: 'Tenant One', role: 'tenant', email: 'one@example.com' },
  { name: 'Tenant Two', role: 'tenant', email: 'two@example.com' },
];

describe('derivePartyValues', () => {
  it('fills the two variables the opening clause requires', () => {
    const values = derivePartyValues(TWO_LANDLORDS_TWO_TENANTS);

    expect(values.landlordNames).toBe('Shwet Prabhat and Ambika Prabhat');
    expect(values.tenantNames).toBe('Tenant One and Tenant Two');
  });

  it('reads as prose for one, two and three parties', () => {
    const one = derivePartyValues([{ name: 'Alone', role: 'tenant', email: 'a@example.com' }]);
    expect(one.tenantNames).toBe('Alone');

    const three = derivePartyValues([
      { name: 'A', role: 'tenant', email: 'a@example.com' },
      { name: 'B', role: 'tenant', email: 'b@example.com' },
      { name: 'C', role: 'tenant', email: 'c@example.com' },
    ]);

    // Serial comma: "A, B, and C" is unambiguous about C being a separate
    // party, which is the whole point of naming them individually.
    expect(three.tenantNames).toBe('A, B, and C');
  });

  it('keeps the order the parties were entered in', () => {
    const reversed = [...TWO_LANDLORDS_TWO_TENANTS].reverse();

    expect(derivePartyValues(reversed).tenantNames).toBe('Tenant Two and Tenant One');
  });

  it('trims stray whitespace rather than rendering it into the lease', () => {
    const values = derivePartyValues([{ name: '  Padded Name  ', role: 'tenant', email: 'p@example.com' }]);

    expect(values.tenantNames).toBe('Padded Name');
  });
});

describe('the §83.505 notice addresses', () => {
  /*
    These used to be two separate interview questions, `landlordNoticeEmail`
    and `tenantNoticeEmail`, typed by hand after the same addresses had already
    been entered against each signer. That was not merely double entry — it was
    WRONG. §83.505 requires a valid email address for EACH party, and a single
    `tenantNoticeEmail` cannot represent two tenants: the addendum named one of
    them and the second had elected nothing.

    Derived from the party list instead, which already holds one address per
    person and validates that each is distinct.
  */
  it('names every landlord and their address', () => {
    const values = derivePartyValues(TWO_LANDLORDS_TWO_TENANTS);

    expect(values.landlordNoticeEmails).toBe(
      'Shwet Prabhat (shwet@example.com) and Ambika Prabhat (ambika@example.com)',
    );
  });

  it('names every tenant, so a second one is not silently left out', () => {
    expect(derivePartyValues(TWO_LANDLORDS_TWO_TENANTS).tenantNoticeEmails).toBe(
      'Tenant One (one@example.com) and Tenant Two (two@example.com)',
    );
  });

  it('reads plainly for a single party', () => {
    const one = derivePartyValues([{ name: 'Alone', role: 'tenant', email: 'a@example.com' }]);

    expect(one.tenantNoticeEmails).toBe('Alone (a@example.com)');
  });

  it('uses the serial comma for three, as the name list does', () => {
    const three = derivePartyValues([
      { name: 'A', role: 'tenant', email: 'a@example.com' },
      { name: 'B', role: 'tenant', email: 'b@example.com' },
      { name: 'C', role: 'tenant', email: 'c@example.com' },
    ]);

    expect(three.tenantNoticeEmails).toBe('A (a@example.com), B (b@example.com), and C (c@example.com)');
  });

  it('is empty when nobody holds that role', () => {
    expect(derivePartyValues([{ name: 'X', role: 'tenant', email: 'x@example.com' }]).landlordNoticeEmails).toBe('');
  });

  it('trims the address, so a stray space is not printed into an addendum', () => {
    const values = derivePartyValues([{ name: 'A', role: 'tenant', email: '  a@example.com  ' }]);

    expect(values.tenantNoticeEmails).toBe('A (a@example.com)');
  });
});

describe('toLeaseParties', () => {
  it('preserves order exactly, because recipient numbering is positional', () => {
    const parties = toLeaseParties(TWO_LANDLORDS_TWO_TENANTS);

    expect(parties.map((p) => p.name)).toEqual(['Shwet Prabhat', 'Ambika Prabhat', 'Tenant One', 'Tenant Two']);
  });

  it('does not carry the email into the render layer', () => {
    // The rendered PDF must not contain signing emails; they belong to the
    // envelope, not the document.
    expect(toLeaseParties(TWO_LANDLORDS_TWO_TENANTS)[0]).toEqual({
      name: 'Shwet Prabhat',
      role: 'landlord',
    });
  });
});

describe('partyEmails', () => {
  it('keys by the same trimmed name the render layer uses', () => {
    const parties: LeasePartyInput[] = [{ name: '  Shwet Prabhat ', role: 'landlord', email: 'shwet@example.com' }];

    // buildEnvelopeInput looks up emails[party.name]; if trimming happened in
    // one and not the other, every lookup would miss.
    expect(partyEmails(parties)).toEqual({ 'Shwet Prabhat': 'shwet@example.com' });
    expect(toLeaseParties(parties)[0].name).toBe('Shwet Prabhat');
  });
});

describe('validateParties', () => {
  it('accepts a well-formed list', () => {
    expect(validateParties(TWO_LANDLORDS_TWO_TENANTS)).toEqual([]);
  });

  it('requires at least one landlord and one tenant', () => {
    const noTenant = validateParties([{ name: 'Only', role: 'landlord', email: 'a@example.com' }]);
    expect(noTenant.join(' ')).toMatch(/tenant/i);

    const noLandlord = validateParties([{ name: 'Only', role: 'tenant', email: 'a@example.com' }]);
    expect(noLandlord.join(' ')).toMatch(/landlord/i);
  });

  it('rejects duplicate names — the silent mis-delivery case', () => {
    const findings = validateParties([
      { name: 'Chris Keane', role: 'tenant', email: 'chris@example.com' },
      { name: 'Chris Keane', role: 'tenant', email: 'other@example.com' },
      { name: 'Landlord', role: 'landlord', email: 'l@example.com' },
    ]);

    expect(findings.join(' ')).toMatch(/Chris Keane/);
  });

  it('treats names differing only in whitespace or case as duplicates', () => {
    const findings = validateParties([
      { name: 'Chris Keane', role: 'tenant', email: 'a@example.com' },
      { name: ' chris keane ', role: 'tenant', email: 'b@example.com' },
      { name: 'Landlord', role: 'landlord', email: 'l@example.com' },
    ]);

    expect(findings.length).toBeGreaterThan(0);
  });

  it('rejects a duplicate email — two signing links to one inbox', () => {
    const findings = validateParties([
      { name: 'Tenant One', role: 'tenant', email: 'shared@example.com' },
      { name: 'Tenant Two', role: 'tenant', email: 'SHARED@example.com' },
      { name: 'Landlord', role: 'landlord', email: 'l@example.com' },
    ]);

    expect(findings.join(' ')).toMatch(/shared@example\.com/i);
  });

  it('requires a name and a plausible email on every party', () => {
    expect(validateParties([{ name: '', role: 'tenant', email: 'a@example.com' }]).length).toBeGreaterThan(0);
    expect(validateParties([{ name: 'X', role: 'tenant', email: 'not-an-email' }]).length).toBeGreaterThan(0);
  });

  it('reports every problem at once rather than one per attempt', () => {
    const findings = validateParties([
      { name: '', role: 'tenant', email: 'bad' },
      { name: '', role: 'tenant', email: 'bad' },
    ]);

    // Missing landlord, blank names, invalid emails, duplicates — a form that
    // surfaces one error per submission makes a four-party list a four-round trip.
    expect(findings.length).toBeGreaterThan(1);
  });
});
