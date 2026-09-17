import { describe, expect, it } from 'vitest';
import { compileMcaTemplate } from './compile';
import { type McaProviderProfileInput, ZMcaProviderProfile } from './profile';
import { providerFixture } from './profile.fixture';

/**
 * The fee schedule the Appendix already demands.
 *
 * `frpa.appendix-a-fees-collectible` says Buyer may charge only a fee
 * identified in the completed Appendix "by its name, its dollar amount or a
 * lawful calculation method, the person to whom it is paid, what it is for, and
 * when it is charged", and that a fee left blank "is $0.00 and may not be
 * charged". Nothing collected any of that, so every funder's Appendix was
 * empty and every fee was therefore $0.00 by the document's own terms.
 *
 * These rows are the funder's, not a fixed list: the next funder charges
 * different fees, and the clause binds whatever they enter.
 */
const withFees = (fees: McaProviderProfileInput['policy']['fees']) => {
  const base = providerFixture();
  return { ...base, policy: { ...base.policy, fees } };
};

const ORIGINATION = {
  name: 'Origination fee',
  basis: 'amount' as const,
  amount: '500.00',
  payee: 'Buyer',
  purpose: 'Underwriting and preparation of this Agreement',
  when: 'Deducted from the Purchase Price at funding',
};

describe('a funder states its own fees', () => {
  it('accepts a schedule with no fees at all', () => {
    expect(ZMcaProviderProfile.safeParse(withFees([])).success).toBe(true);
  });

  it('accepts a fee stated as a dollar amount', () => {
    expect(ZMcaProviderProfile.safeParse(withFees([ORIGINATION])).success).toBe(true);
  });

  it('accepts a fee stated as a calculation method, which the clause allows', () => {
    const { amount: _amount, ...rest } = ORIGINATION;
    const rate = { ...rest, basis: 'method' as const, method: '3% of the Purchase Price' };

    expect(ZMcaProviderProfile.safeParse(withFees([rate])).success).toBe(true);
  });

  it('refuses a fee that states neither an amount nor a method', () => {
    const { amount: _amount, ...bare } = ORIGINATION;
    // The type already refuses this, which is why the cast is here: the point
    // is that validation refuses it too, for input arriving as JSON.
    const fees = [bare] as McaProviderProfileInput['policy']['fees'];

    expect(ZMcaProviderProfile.safeParse(withFees(fees)).success).toBe(false);
  });

  it('refuses a fee that does not say who is paid, what for, or when', () => {
    for (const key of ['payee', 'purpose', 'when'] as const) {
      expect(ZMcaProviderProfile.safeParse(withFees([{ ...ORIGINATION, [key]: '' }])).success, key).toBe(false);
    }
  });

  it('carries the schedule onto the agreement it belongs to', () => {
    const snapshot = compileMcaTemplate(withFees([ORIGINATION]), 'frpa');
    const frpa = snapshot.documents.find((document) => document.instrument === 'frpa');

    expect(frpa?.feeSchedule).toEqual([ORIGINATION]);
  });

  it('gives an instrument that charges no fee an empty schedule, not a missing one', () => {
    const snapshot = compileMcaTemplate(withFees([]), 'frpa');
    const frpa = snapshot.documents.find((document) => document.instrument === 'frpa');

    expect(frpa?.feeSchedule).toEqual([]);
  });
});

/**
 * A revision saved before fees existed still opens.
 *
 * `fees` cannot be a zod `.default()`: that makes the schema's input and output
 * types differ, and the saved-profile boundaries carry the input type, so the
 * components stopped typechecking. Making it required instead means a stored
 * revision without the key has to be normalised explicitly — which is a thing
 * somebody can read, unlike a default that silently rewrites what was saved.
 */
describe('a profile saved before this release', () => {
  const legacy = () => {
    const { fees: _fees, ...policy } = providerFixture().policy;
    return { ...providerFixture(), policy };
  };

  it('compiles, and charges nothing', () => {
    const snapshot = compileMcaTemplate(legacy(), 'frpa');
    const frpa = snapshot.documents.find((document) => document.instrument === 'frpa');

    expect(frpa?.feeSchedule).toEqual([]);
  });

  it('parses, and reads as charging nothing', () => {
    const parsed = ZMcaProviderProfile.parse(legacy());

    expect(parsed.policy.fees).toEqual([]);
  });
});
