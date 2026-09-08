import { describe, expect, it } from 'vitest';

import { READING_GOES_STALE_AFTER_DAYS, readingAge } from '../provenance/reading-age';

/*
  HOW LONG AGO A HUMAN LAST READ THE REGULATION.

  The digest answers "has anyone edited our copy?" and `/admin/mca` was showing
  its answer under the word "verified", which a reader takes to mean something
  much stronger. It cannot mean that: when a regulator amends a rule our
  vendored file does not move, so the digest still matches and the card stays
  green about text that is now wrong. Nothing in this package can see an
  amendment. The only honest thing it can say is how old the reading is.

  So age is derived here from the verification dates and a clock, and `now` is
  a parameter rather than a call to `new Date()` inside. Two reasons, and the
  second is the one that bites: a view model that reads the clock is a view
  model whose stale branch is only reachable by waiting six months, which is a
  branch nobody ever tests.
*/

const AT = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('a reading is as old as its oldest applicable date', () => {
  it('takes the OLDER of two dates, not the more flattering one', () => {
    const age = readingAge(['2026-09-01', '2026-03-01'], AT('2026-09-08'));

    expect(age.lastReadAt).toBe('2026-03-01');
    expect(age.daysSinceRead).toBe(191);
    expect(age.freshness).toBe('stale');
  });

  it('is fresh inside the threshold', () => {
    const age = readingAge(['2026-09-07'], AT('2026-09-08'));

    expect(age.freshness).toBe('fresh');
    expect(age.daysSinceRead).toBe(1);
    expect(age.unusableDates).toEqual([]);
  });

  /*
    THE BOUNDARY, BOTH SIDES. A threshold asserted only in the middle of its
    range is a threshold that can drift by a day and nothing notices.
  */
  it('goes stale the day after the threshold, and not before', () => {
    const read = Date.UTC(2026, 0, 1);
    const day = 24 * 60 * 60 * 1000;
    const on = (days: number) => new Date(read + days * day + 12 * 60 * 60 * 1000);

    expect(readingAge(['2026-01-01'], on(READING_GOES_STALE_AFTER_DAYS)).freshness).toBe('fresh');
    expect(readingAge(['2026-01-01'], on(READING_GOES_STALE_AFTER_DAYS + 1)).freshness).toBe('stale');
  });

  it('is never-read when any applicable date is missing', () => {
    const age = readingAge(['2026-09-07', null], AT('2026-09-08'));

    expect(age.freshness).toBe('never-read');
    expect(age.lastReadAt).toBeNull();
    expect(age.daysSinceRead).toBeNull();
  });

  it('is never-read when there is no applicable date at all', () => {
    expect(readingAge([], AT('2026-09-08')).freshness).toBe('never-read');
  });

  /*
    A DATE THAT IS NOT A DATE, AND A DATE THAT HAS NOT HAPPENED YET.

    Both are typed values that nothing else in the package looks at:
    `assertPublishable` asks whether a date is PRESENT, and "tomorrow" and
    "soon" are both present. Neither may be allowed to read as a fresh reading —
    the failure mode of this whole page is a row that looks reassuring — so both
    are reported by name and the entry falls to never-read.
  */
  it('refuses a date that does not parse, and says which one', () => {
    const age = readingAge(['soon'], AT('2026-09-08'));

    expect(age.freshness).toBe('never-read');
    expect(age.unusableDates).toEqual(['soon']);
  });

  it('refuses a date in the future', () => {
    const age = readingAge(['2027-01-01'], AT('2026-09-08'));

    expect(age.freshness).toBe('never-read');
    expect(age.unusableDates).toEqual(['2027-01-01']);
  });

  /*
    The threshold is a judgement and it is written down. Pinned so that changing
    it is a deliberate edit to a test as well as to a constant — the comment on
    the constant carries the argument.
  */
  it('holds the threshold at 180 days', () => {
    expect(READING_GOES_STALE_AFTER_DAYS).toBe(180);
  });
});
