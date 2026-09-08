/**
 * How long ago a human last read the regulation.
 *
 * THE HOLE THIS FILLS. Every other check in this package compares our text to
 * our vendored copy of the rule. None of them can see the rule change: when a
 * regulator amends a regulation our file does not move, the digest still
 * matches, every prescribed sentence is still found where it was, and
 * `/admin/mca` goes on saying "verified" about text that is now wrong. That is
 * not a bug in the digest — the digest answers "has anyone edited our copy?"
 * faithfully. It is a question nothing was asking.
 *
 * Nothing here can ask it either. What can be stated without a regulator's
 * feed is how old the reading is, and that is the whole of what this module
 * does: turn two dates and a clock into "fresh" or "stale", so a stale card
 * stops looking identical to a fresh one.
 *
 * `now` IS A PARAMETER, NOT A CALL TO `new Date()` INSIDE. Determinism is the
 * lesser reason. The real one is that a stale branch computed from the wall
 * clock is a branch reachable only by waiting six months, and a branch nobody
 * can reach in a test is a branch nobody has tested — this package has already
 * shipped two assertions that filtered on values that do not exist and passed
 * vacuously for a day.
 */

/**
 * When a reading stops being current: 180 days.
 *
 * THE ARGUMENT, so that changing it is an argument and not a preference.
 *
 * Commercial-financing disclosure law is moving. Every state here enacted its
 * act since 2022, four have amended or added implementing rules since, and the
 * changes arrive on a legislative calendar: most of these legislatures sit in
 * one regular session a year, and what passes takes effect on one of two
 * conventional dates — 1 January or 1 July. Georgia's act took effect 1 January
 * 2024, Connecticut's 1 July 2024, Texas's implementing rules 9 July 2026.
 *
 * 180 days is the largest threshold that guarantees at least one human reading
 * between any two consecutive conventional effective dates. A year would allow
 * a full session's amendments to land, take effect and sit unread while the
 * page called the state verified. Ninety days would produce a page that is
 * amber for everything, which trains a reader to ignore the colour — the same
 * failure as a checker that cries wolf.
 *
 * It is a threshold on OUR reading, not a claim about the law: a rule can be
 * amended the day after a reading, and this will call that card fresh for six
 * months. The honest reading of "fresh" is "recently looked at", never "current".
 */
export const READING_GOES_STALE_AFTER_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

export type Freshness =
  /** Read within the threshold. */
  | 'fresh'
  /** Read, but longer ago than the threshold. */
  | 'stale'
  /** No usable date: never read, or a date that is not one. */
  | 'never-read';

export type ReadingAge = {
  freshness: Freshness;
  /** The OLDEST applicable date — a claim is only as current as its stalest half. */
  lastReadAt: string | null;
  daysSinceRead: number | null;
  /**
   * Dates that were present and could not be used: unparsable, or in the
   * future. Reported by name rather than silently ignored — `assertPublishable`
   * asks only whether a date is PRESENT, and "soon" and "next Tuesday" are both
   * present.
   */
  unusableDates: string[];
};

/**
 * Age a set of verification dates.
 *
 * `dates` are the ones that APPLY to a spec — the caller decides, because a
 * content-only statute prescribes no structure and a null structure date there
 * is an absent obligation rather than a gap. A null among them means never
 * read: a form whose words were checked and whose rows were not has not been
 * read, whatever the other date says.
 */
export const readingAge = (dates: readonly (string | null)[], now: Date): ReadingAge => {
  const unusableDates: string[] = [];
  const times: { at: string; ms: number }[] = [];

  for (const date of dates) {
    if (date === null) {
      continue;
    }

    const ms = Date.parse(date);

    // A date in the future is not a reading that happened. It is a typed value,
    // and treating it as the freshest reading on the page would make a typo the
    // strongest evidence in the package.
    if (Number.isNaN(ms) || ms > now.getTime()) {
      unusableDates.push(date);
      continue;
    }

    times.push({ at: date, ms });
  }

  const usable = times.length === dates.length && dates.length > 0;

  if (!usable) {
    return { freshness: 'never-read', lastReadAt: null, daysSinceRead: null, unusableDates };
  }

  const oldest = times.reduce((a, b) => (b.ms < a.ms ? b : a));
  const daysSinceRead = Math.floor((now.getTime() - oldest.ms) / DAY_MS);

  return {
    freshness: daysSinceRead > READING_GOES_STALE_AFTER_DAYS ? 'stale' : 'fresh',
    lastReadAt: oldest.at,
    daysSinceRead,
    unusableDates,
  };
};
