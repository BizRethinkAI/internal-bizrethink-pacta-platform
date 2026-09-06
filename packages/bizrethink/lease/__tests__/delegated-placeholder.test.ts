import { describe, expect, it } from 'vitest';

import type { InterpolationValue } from '../render/interpolate';
import { interpolateClause } from '../render/interpolate';

/**
 * A field the landlord handed to the tenant should read as a blank to fill in,
 * not as a bug.
 *
 * The standing rule is right and stays: a missing value never renders as empty,
 * because a gap where a repair threshold belongs reads as a finished lease with
 * no threshold. The raw `{{repairThresholdUsd}}` reads as obviously unfinished,
 * and the send is refused.
 *
 * A DELEGATED field is the one case where that reasoning inverts. The landlord
 * is never going to answer it — they deliberately gave it to the tenant — and
 * the tenant is exactly who downloads the PDF. So `{{permittedPets}}` appears
 * in the Pet Addendum of the document sent to the person being asked about
 * their pets, which reads as a broken template rather than a question.
 *
 * It still counts as missing. Only the rendering changes; the send gate does
 * not move.
 */

const variables = [{ name: 'permittedPets', type: 'string' as const, label: 'Pets', required: true }];

const run = (values: Record<string, InterpolationValue>, delegated?: string[]) =>
  interpolateClause({
    body: 'Tenant may keep the following animals: {{permittedPets}}.',
    variables,
    values,
    delegated,
  });

describe('a delegated field that has not come back', () => {
  it('reads as a blank for the tenant to complete, not as a token', () => {
    const { text } = run({}, ['permittedPets']);

    expect(text).toBe('Tenant may keep the following animals: [to be completed by Tenant].');
    expect(text).not.toContain('{{');
  });

  /*
    The whole point of the send gate is that it does not soften. Rendering it
    legibly must not make the lease look answerable.
  */
  it('is still reported missing, so the send is still refused', () => {
    expect(run({}, ['permittedPets']).missing).toEqual(['permittedPets']);
  });

  it('renders the answer once it arrives', () => {
    const { text, missing } = run({ permittedPets: 'one cat, indoor only' }, ['permittedPets']);

    expect(text).toBe('Tenant may keep the following animals: one cat, indoor only.');
    expect(missing).toEqual([]);
  });
});

describe('a field the landlord kept', () => {
  /*
    Unchanged, and deliberately so. The landlord is the one who can answer it,
    and a raw token is the signal that they have not.
  */
  it('still leaves the raw token, because the landlord can answer it', () => {
    const { text, missing } = run({});

    expect(text).toContain('{{permittedPets}}');
    expect(missing).toEqual(['permittedPets']);
  });

  it('is unaffected by another field being delegated', () => {
    const { text } = run({}, ['someOtherField']);

    expect(text).toContain('{{permittedPets}}');
  });
});
