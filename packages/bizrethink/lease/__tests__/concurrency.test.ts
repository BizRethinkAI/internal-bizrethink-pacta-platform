import { describe, expect, it } from 'vitest';

import { staleWriteMessage } from '../matters/concurrency';

/**
 * Two writers share the answer column.
 *
 * The landlord's interview seeds every answer into React state at mount and
 * writes the whole set back on each step change; `applyTenantAnswers` writes
 * the tenant's returned answers into that same column. Nothing resynced the
 * landlord's copy, so having the page open when a tenant returned their review
 * link destroyed what they sent — on the next click of Next, with no warning.
 */

const at = (iso: string) => new Date(iso);

describe('staleWriteMessage', () => {
  it('allows a write built on the current row', () => {
    expect(staleWriteMessage({ expected: at('2026-09-01T10:00:00Z'), actual: at('2026-09-01T10:00:00Z') })).toBeNull();
  });

  it('refuses a write built on an older read', () => {
    const message = staleWriteMessage({
      expected: at('2026-09-01T10:00:00Z'),
      actual: at('2026-09-01T10:05:00Z'),
    });

    expect(message).not.toBeNull();
    expect(message).toMatch(/changed somewhere else/i);
  });

  /*
    The message has to say what to DO. "Conflict" tells a solo landlord
    nothing; the recovery is a reload, and the cost is re-entering only what
    they typed since.
  */
  it('names the likely cause and the recovery', () => {
    const message = staleWriteMessage({ expected: at('2026-09-01T10:00:00Z'), actual: at('2026-09-01T10:05:00Z') });

    expect(message).toMatch(/tenant/i);
    expect(message).toMatch(/reload/i);
  });

  it('accepts ISO strings, since that is what crosses the wire', () => {
    expect(staleWriteMessage({ expected: '2026-09-01T10:00:00.000Z', actual: at('2026-09-01T10:00:00Z') })).toBeNull();
    expect(
      staleWriteMessage({ expected: '2026-09-01T10:00:00.000Z', actual: at('2026-09-01T11:00:00Z') }),
    ).not.toBeNull();
  });

  /*
    An older client that sends nothing must keep working. Failing those saves
    would replace a rare lost update with a constant one.
  */
  it('lets a client that sends no expectation through', () => {
    for (const expected of [null, undefined, '']) {
      expect(staleWriteMessage({ expected, actual: at('2026-09-01T10:05:00Z') })).toBeNull();
    }
  });

  it('does not refuse on an unparseable value', () => {
    expect(staleWriteMessage({ expected: 'not a date', actual: at('2026-09-01T10:00:00Z') })).toBeNull();
  });
});
