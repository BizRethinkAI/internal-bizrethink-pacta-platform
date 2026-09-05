import { describe, expect, it } from 'vitest';

import { deletionBlockers, describeOpened } from '../review/deletion';

/*
  A revoked link is not clutter, it is a record: this document went to this
  person on this date, pinned to the answer set as it then stood. If a tenant
  later says they were never sent the lease, that row is the answer.

  So deletion is refused wherever the row still carries evidence — anything the
  reviewer did, or anything they said. What is left is the genuinely empty case:
  a link nobody ever opened and nobody ever commented on. That is the one the
  landlord actually wants gone, and it is the only one that can go.
*/

const review = (over: Record<string, unknown> = {}) => ({
  status: 'closed' as const,
  firstOpenedAt: null as Date | null,
  returnedAt: null as Date | null,
  ...over,
});

describe('deletionBlockers', () => {
  it('permits deleting a revoked link nobody opened and nobody commented on', () => {
    expect(deletionBlockers(review(), 0)).toEqual([]);
  });

  it('refuses while the link is still live', () => {
    expect(deletionBlockers(review({ status: 'open' }), 0)).toContain('This link is still live. Revoke it first.');
  });

  it('refuses once the reviewer has opened it, because that is the delivery record', () => {
    const blockers = deletionBlockers(review({ firstOpenedAt: new Date('2026-09-03') }), 0);
    expect(blockers.join(' ')).toMatch(/opened/i);
  });

  it('refuses when comments hang off it', () => {
    expect(deletionBlockers(review(), 2).join(' ')).toMatch(/comment/i);
  });

  it('refuses a returned review even with no comments', () => {
    const blockers = deletionBlockers(review({ status: 'returned', returnedAt: new Date() }), 0);
    expect(blockers.length).toBeGreaterThan(0);
  });

  it('reports every reason at once rather than one at a time', () => {
    const blockers = deletionBlockers(review({ status: 'open', firstOpenedAt: new Date() }), 3);
    expect(blockers.length).toBe(3);
  });
});

describe('describeOpened', () => {
  /*
    "Opened" is evidence that the URL was FETCHED. Mail scanners and link
    previewers fetch links, so the wording must not promise that a person read
    the lease — the landlord would rely on it.
  */
  it('says the link was opened, never that the reviewer read anything', () => {
    const text = describeOpened(new Date('2026-09-03T21:14:00Z'), 1);
    expect(text).toMatch(/opened/i);
    expect(text).not.toMatch(/\bread\b|\breviewed\b|\bviewed by\b/i);
  });

  it('distinguishes never-opened from opened, because the landlord acts on it', () => {
    expect(describeOpened(null, 0)).toBe('Not opened yet');
  });

  it('counts repeat opens, which is the difference between a glance and a read', () => {
    expect(describeOpened(new Date('2026-09-03T21:14:00Z'), 4)).toMatch(/4 times/);
  });

  it('does not say "1 times"', () => {
    expect(describeOpened(new Date('2026-09-03T21:14:00Z'), 1)).not.toMatch(/1 times/);
  });
});
