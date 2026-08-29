import { describe, expect, it } from 'vitest';

import { parseCensusResponse, titleCaseAddress } from '../address/census';
import fixture from './census-picana.fixture.json';

/**
 * Address normalisation against the US Census geocoder.
 *
 * The fixture is a REAL captured response for 29090 Picana Ln — the property
 * this is being dogfooded on — rather than a hand-written approximation of one.
 * Two things about the real shape would not have been guessed:
 *
 *   1. `matchedAddress` comes back in ALL CAPS, and printing "29090 PICANA LN"
 *      into a signed lease is not acceptable.
 *   2. `addressComponents` has no house number at all — `fromAddress` and
 *      `toAddress` are the block RANGE ("29298"/"29000"), not this property.
 *      Building the street line from components would silently produce the
 *      wrong number, so it is parsed from `matchedAddress` instead.
 *
 * The county is the reason this exists. It sets legal venue, a landlord
 * frequently does not know it, and it is the one legally-relevant field
 * available from a free national source.
 */

describe('parseCensusResponse', () => {
  it('extracts the address and county from a real response', () => {
    const parsed = parseCensusResponse(fixture);

    expect(parsed).toEqual({
      addressLine: '29090 Picana Ln',
      city: 'Wesley Chapel',
      state: 'FL',
      postalCode: '33543',
      county: 'Pasco',
    });
  });

  it('strips the "County" suffix, because the lease already says the word', () => {
    // The venue clause reads "the courts of {{venueCounty}} County" — so
    // storing "Pasco County" would render "Pasco County County".
    expect(parseCensusResponse(fixture)?.county).toBe('Pasco');
  });

  it('returns null when nothing matched rather than guessing', () => {
    expect(parseCensusResponse({ result: { addressMatches: [] } })).toBeNull();
    expect(parseCensusResponse({})).toBeNull();
    expect(parseCensusResponse(null)).toBeNull();
  });

  it('survives a match that carries no county geography', () => {
    const noCounty = {
      result: {
        addressMatches: [{ matchedAddress: '1 MAIN ST, SPRINGFIELD, IL, 62701', geographies: {} }],
      },
    };

    expect(parseCensusResponse(noCounty)).toMatchObject({
      addressLine: '1 Main St',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      county: null,
    });
  });

  it('ignores a malformed matchedAddress instead of writing fragments into a lease', () => {
    const malformed = { result: { addressMatches: [{ matchedAddress: 'NOT AN ADDRESS', geographies: {} }] } };

    expect(parseCensusResponse(malformed)).toBeNull();
  });
});

describe('titleCaseAddress', () => {
  it('converts the geocoder’s shouting into something printable', () => {
    expect(titleCaseAddress('29090 PICANA LN')).toBe('29090 Picana Ln');
    expect(titleCaseAddress('WESLEY CHAPEL')).toBe('Wesley Chapel');
  });

  it('keeps directionals and ordinals as people write them', () => {
    expect(titleCaseAddress('123 NW 42ND ST')).toBe('123 NW 42nd St');
    expect(titleCaseAddress('9 SE MAIN AVE')).toBe('9 SE Main Ave');
  });

  it('handles hyphenated and apostrophised names', () => {
    expect(titleCaseAddress('MIAMI-DADE')).toBe('Miami-Dade');
    expect(titleCaseAddress("O'BRIEN CT")).toBe("O'Brien Ct");
  });

  it('leaves numbers alone', () => {
    expect(titleCaseAddress('29090')).toBe('29090');
  });
});
