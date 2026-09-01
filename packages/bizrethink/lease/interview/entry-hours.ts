/**
 * Reading the entry window the landlord actually typed.
 *
 * The two entry-time answers are free text ("9:00am", "6:00pm") and the
 * earliest one carries a §83.53(2) chip saying the statute treats 7:30am to
 * 8:00pm as the reasonable hours. The rule pack checks exactly that — and the
 * router handed it the constants 9 and 18, never the answers.
 *
 * So a landlord could type "6:00am" and "11:00pm", see zero findings, and
 * print that window verbatim into a clause whose own comment claims the rule
 * pack rejects an answer below the floor. The check ran; it just ran against
 * numbers nobody had entered.
 */

/**
 * Hours since midnight, fractional — 7:30am is 7.5, matching how the rule pack
 * states the §83.53(2) bounds.
 *
 * `null` where the text cannot be read as a time. An unparseable answer must
 * not silently become midnight: zero would sit below every floor and turn a
 * typo into a statutory finding about a window the landlord never stated.
 */
export const parseHour = (label: string): number | null => {
  const text = label.trim().toLowerCase().replace(/\s+/g, '');

  const match = /^(\d{1,2})(?::(\d{2}))?(am|pm)?$/.exec(text);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3];

  if (minutes > 59) {
    return null;
  }

  if (meridiem === undefined) {
    // 24-hour, which is what a "18:00" answer means.
    return hour > 23 ? null : hour + minutes / 60;
  }

  if (hour < 1 || hour > 12) {
    return null;
  }

  const base = hour === 12 ? 0 : hour;

  return (meridiem === 'pm' ? base + 12 : base) + minutes / 60;
};

/**
 * The window for the rule pack, falling back to the statutory bounds where an
 * answer cannot be read.
 *
 * Falling back INSIDE the permitted window rather than outside it: an
 * unreadable answer is a defect in the answer, and reporting it as a §83.53(2)
 * breach would cite a statute at somebody for a typo. The unfilled-variable
 * check is what catches a blank.
 */
export const entryWindow = (
  earliest: unknown,
  latest: unknown,
  fallback: { earliestHour: number; latestHour: number },
): { earliestHour: number; latestHour: number } => ({
  earliestHour: parseHour(String(earliest ?? '')) ?? fallback.earliestHour,
  latestHour: parseHour(String(latest ?? '')) ?? fallback.latestHour,
});
