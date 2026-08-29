/**
 * Address validation and county lookup, via the US Census geocoder.
 *
 * WHY THIS SOURCE. The requirement was national, fast and free, and free is
 * the constraint that decides everything. Zillow retired its public API in
 * 2021 and prohibits automated access; the paid aggregators start around
 * $299/mo; the free tiers that carry building attributes cap at a handful of
 * properties. The Census geocoder is the only genuinely free national option —
 * no API key, no account, US government data — and it answers the one
 * legally-relevant question available at that price: which county.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It returns no `yearBuilt`. That field
 * decides whether the federal lead-paint disclosure fires (42 U.S.C. §4852d),
 * so a confidently wrong value silently drops a mandatory disclosure from a
 * signed lease. The interview asks for it instead and treats "unknown" as
 * "include the disclosure" — a fail-safe an API guess would defeat.
 *
 * ON BLUR, NOT PER KEYSTROKE. This is a lookup, not a typeahead. Free national
 * autocomplete effectively does not exist (Google Places requires billing,
 * Nominatim's terms discourage per-keystroke use), and the Census service is a
 * shared public resource — one request when a field loses focus is a fair use
 * of it, one per character is not.
 */

const ENDPOINT = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';

export type NormalisedAddress = {
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  /** Without the word "County" — the venue clause supplies that itself. */
  county: string | null;
};

/*
  Directionals stay upper. "123 Nw 42nd St" is wrong in a way people notice,
  and street suffixes are already title-cased correctly by the general rule.
*/
const KEEP_UPPER = new Set(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW', 'US', 'PO']);

/** "1ST", "42ND", "3RD", "9TH" → lowercase suffix. */
const ORDINAL = /^(\d+)(ST|ND|RD|TH)$/i;

/**
 * The geocoder shouts. A lease does not.
 *
 * Splits on spaces but title-cases across hyphens and apostrophes too, so
 * "MIAMI-DADE" and "O'BRIEN" come out as people write them rather than as
 * "Miami-dade" and "O'brien".
 */
export const titleCaseAddress = (input: string): string =>
  input
    .trim()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();

      if (KEEP_UPPER.has(upper)) {
        return upper;
      }

      const ordinal = ORDINAL.exec(word);

      if (ordinal) {
        return `${ordinal[1]}${ordinal[2].toLowerCase()}`;
      }

      // Purely numeric — a house number or a ZIP. Leave it exactly as it is.
      if (/^\d+$/.test(word)) {
        return word;
      }

      return word
        .toLowerCase()
        .replace(/(^|[-'])([a-z])/g, (_match, boundary: string, letter: string) => boundary + letter.toUpperCase());
    })
    .join(' ');

const readCounty = (geographies: unknown): string | null => {
  if (typeof geographies !== 'object' || geographies === null) {
    return null;
  }

  const counties = (geographies as Record<string, unknown>).Counties;

  if (!Array.isArray(counties) || counties.length === 0) {
    return null;
  }

  const name = (counties[0] as Record<string, unknown>)?.NAME;

  if (typeof name !== 'string' || name.trim() === '') {
    return null;
  }

  /*
    "Pasco County" → "Pasco". The venue clause reads "the courts of
    {{venueCounty}} County", so keeping the suffix would render
    "Pasco County County" in a signed lease.

    Only a trailing "County" is stripped, and only as a whole word — Florida
    has no county whose name ends in it, but "Countyline" would survive.
  */
  return name.trim().replace(/\s+County$/i, '');
};

/**
 * Parse a geocoder response into the fields the property record holds.
 *
 * Reads the street line from `matchedAddress` rather than `addressComponents`,
 * which is counter-intuitive but necessary: the components carry no house
 * number at all. `fromAddress` and `toAddress` are the block range — for
 * 29090 Picana Ln they are 29298 and 29000 — so assembling the line from
 * components would produce a confidently wrong street number.
 */
export const parseCensusResponse = (payload: unknown): NormalisedAddress | null => {
  const matches = (payload as { result?: { addressMatches?: unknown } })?.result?.addressMatches;

  if (!Array.isArray(matches) || matches.length === 0) {
    return null;
  }

  const match = matches[0] as Record<string, unknown>;
  const matched = match.matchedAddress;

  if (typeof matched !== 'string') {
    return null;
  }

  // "29090 PICANA LN, WESLEY CHAPEL, FL, 33543"
  const parts = matched.split(',').map((part) => part.trim());

  if (parts.length < 4) {
    return null;
  }

  const [street, city, state, postalCode] = parts;

  return {
    addressLine: titleCaseAddress(street),
    city: titleCaseAddress(city),
    // Two-letter codes stay upper.
    state: state.toUpperCase(),
    postalCode,
    county: readCounty(match.geographies),
  };
};

/**
 * Look one address up.
 *
 * Returns null rather than throwing on any failure — a geocoder that is slow,
 * rate-limiting or simply wrong must never stand between a landlord and a
 * lease. Everything it fills can be typed by hand.
 */
export const lookupAddress = async (address: string, signal?: AbortSignal): Promise<NormalisedAddress | null> => {
  if (address.trim().length < 6) {
    return null;
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set('address', address);
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('vintage', 'Current_Current');
  url.searchParams.set('format', 'json');

  try {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      return null;
    }

    return parseCensusResponse(await response.json());
  } catch {
    return null;
  }
};
