const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * `2026-10-01` -> `October 1, 2026`. The one date format in the lease package.
 *
 * There were three. Key Terms read "October 1, 2026", clause 3.1 "1 October
 * 2026" and the governing-document receipt "20 July 2015" — each formatted in
 * its own place, so nothing kept them the same. A Florida lease reads dates the
 * way a US reader writes them.
 *
 * Parsed by hand from the ISO prefix, never through `Date` and a locale: the
 * renderer runs on a server whose timezone and locale are the container's, and
 * `new Date('2026-10-01')` is midnight UTC — September 30 in Florida.
 *
 * Empty for anything that is not an ISO date, so a caller can leave it out.
 */
export const formatLongDate = (iso: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());

  if (!match) {
    return '';
  }

  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];

  return name ? `${name} ${Number(day)}, ${year}` : '';
};
