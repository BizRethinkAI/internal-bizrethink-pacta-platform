import { describe, expect, it } from 'vitest';

import { entryWindow, parseHour } from '../interview/entry-hours';

/**
 * The §83.53(2) check ran against constants, not answers.
 *
 * Both entry times are free text, the earliest carries a chip saying the
 * statute treats 7:30am to 8:00pm as reasonable, and the router handed the rule
 * pack `earliestHour: 9, latestHour: 18` — hardcoded. A landlord could type
 * "6:00am" and "11:00pm", see no findings at all, and have that window printed
 * verbatim into the lease.
 */

describe('parseHour', () => {
  it('reads a 12-hour time', () => {
    expect(parseHour('9:00am')).toBe(9);
    expect(parseHour('6:00pm')).toBe(18);
  });

  it('reads the half hours the statute is stated in', () => {
    expect(parseHour('7:30am')).toBe(7.5);
    expect(parseHour('8:00pm')).toBe(20);
  });

  it('handles noon and midnight, where 12 does not mean 12', () => {
    expect(parseHour('12:00am')).toBe(0);
    expect(parseHour('12:00pm')).toBe(12);
    expect(parseHour('12:30pm')).toBe(12.5);
  });

  it('reads a 24-hour time', () => {
    expect(parseHour('18:00')).toBe(18);
    expect(parseHour('07:30')).toBe(7.5);
  });

  it('is forgiving about spacing and case', () => {
    expect(parseHour(' 9 AM ')).toBe(9);
    expect(parseHour('9am')).toBe(9);
  });

  /*
    An unreadable answer must not become midnight. Zero sits below every floor,
    so a typo would be reported as a §83.53(2) breach about a window the
    landlord never stated.
  */
  it('refuses what it cannot read rather than guessing zero', () => {
    for (const text of ['', 'morning', 'nineish', '25:00', '13:00pm', '9:99am']) {
      expect(parseHour(text), text).toBeNull();
    }
  });
});

describe('entryWindow', () => {
  const statutory = { earliestHour: 7.5, latestHour: 20 };

  it('uses what the landlord typed', () => {
    expect(entryWindow('6:00am', '11:00pm', statutory)).toEqual({ earliestHour: 6, latestHour: 23 });
  });

  /*
    Which is the point: this window is outside §83.53(2), and with the old
    constants the panel reported nothing.
  */
  it('surfaces a window the statute does not permit', () => {
    const { earliestHour, latestHour } = entryWindow('6:00am', '11:00pm', statutory);

    expect(earliestHour).toBeLessThan(statutory.earliestHour);
    expect(latestHour).toBeGreaterThan(statutory.latestHour);
  });

  it('falls back INSIDE the permitted window when an answer cannot be read', () => {
    expect(entryWindow('whenever', null, statutory)).toEqual(statutory);
  });
});
