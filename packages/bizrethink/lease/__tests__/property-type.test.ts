import { describe, expect, it } from 'vitest';

import { propertyTypeLabelFor } from '../interview/property-type';

/**
 * The clause opens "The Premises are a {{propertyTypeLabel}}", and the label
 * used to be `propertyType.replace('-', ' ')`.
 */
describe('propertyTypeLabelFor', () => {
  it('reads as a noun inside the sentence', () => {
    expect(propertyTypeLabelFor('single-family')).toBe('single-family home');
    expect(propertyTypeLabelFor('condo')).toBe('condominium unit');
  });

  it('no longer says "The Premises are a single family"', () => {
    expect(propertyTypeLabelFor('single-family')).not.toBe('single family');
  });

  it('covers every type the interview offers', () => {
    for (const type of ['single-family', 'duplex', 'condo', 'multi-family']) {
      expect(propertyTypeLabelFor(type).length, type).toBeGreaterThan(3);
    }
  });

  /*
    Falling back to the slug rather than to a default: naming the WRONG
    building type in a clause that cites §83.51(2) is worse than naming an
    awkward one.
  */
  it('falls back to the slug rather than guessing a type', () => {
    expect(propertyTypeLabelFor('townhouse')).toBe('townhouse');
    expect(propertyTypeLabelFor('')).toBe('');
  });
});
