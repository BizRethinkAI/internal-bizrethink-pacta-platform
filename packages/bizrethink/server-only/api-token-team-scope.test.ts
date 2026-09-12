import { AppErrorCode } from '@documenso/lib/errors/app-error';
import { describe, expect, it, vi } from 'vitest';

import { getApiTokenEnvelopeScope, withApiTokenTeamScope } from './api-token-team-scope';

describe('API credential context', () => {
  it('adds no API restriction to a human session or background caller', () => {
    expect(getApiTokenEnvelopeScope(10)).toEqual({});
  });

  it('carries the team across async work and restores the caller on success', async () => {
    const result = await withApiTokenTeamScope(10, async () => {
      await new Promise<void>((resolve) => setImmediate(resolve));
      return getApiTokenEnvelopeScope(10);
    });
    expect(result).toEqual({ teamId: 10 });
    expect(getApiTokenEnvelopeScope(10)).toEqual({});
  });

  it('restores the caller after a synchronous throw', () => {
    expect(() =>
      withApiTokenTeamScope(10, () => {
        throw new Error('Synthetic handler failure');
      }),
    ).toThrow('Synthetic handler failure');
    expect(getApiTokenEnvelopeScope(10)).toEqual({});
  });

  it('restores the caller after an asynchronous rejection', async () => {
    await expect(
      withApiTokenTeamScope(10, async () => {
        await Promise.resolve();
        throw new Error('Synthetic async failure');
      }),
    ).rejects.toThrow('Synthetic async failure');
    expect(getApiTokenEnvelopeScope(10)).toEqual({});
  });

  it.each([
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid token team %s before dispatch', (teamId) => {
    const handler = vi.fn();
    expect(() => withApiTokenTeamScope(teamId, handler)).toThrow('Invalid API token team scope');
    expect(handler).not.toHaveBeenCalled();
    expect(getApiTokenEnvelopeScope(10)).toEqual({});
  });

  it("refuses to combine the credential with another team's access role", () => {
    withApiTokenTeamScope(10, () => {
      expect(() => getApiTokenEnvelopeScope(20)).toThrow(expect.objectContaining({ code: AppErrorCode.NOT_FOUND }));
      expect(getApiTokenEnvelopeScope(10)).toEqual({ teamId: 10 });
    });
  });

  it('cannot widen an enclosing API credential through a nested scope', () => {
    withApiTokenTeamScope(10, () => {
      const handler = vi.fn();
      expect(() => withApiTokenTeamScope(20, handler)).toThrow('Invalid API token team scope');
      expect(handler).not.toHaveBeenCalled();
      expect(withApiTokenTeamScope(10, () => getApiTokenEnvelopeScope(10))).toEqual({ teamId: 10 });
    });
  });

  it('shares the boundary across independently loaded module copies', async () => {
    // Remix emits multiple server chunks. The wrapper in a fresh copy must be
    // visible to an already-imported query builder, and vice versa.
    vi.resetModules();
    const secondCopy = await import('./api-token-team-scope');
    expect(secondCopy.withApiTokenTeamScope).not.toBe(withApiTokenTeamScope);
    expect(secondCopy.withApiTokenTeamScope(10, () => getApiTokenEnvelopeScope(10))).toEqual({ teamId: 10 });
    expect(withApiTokenTeamScope(20, () => secondCopy.getApiTokenEnvelopeScope(20))).toEqual({ teamId: 20 });
    expect(getApiTokenEnvelopeScope(10)).toEqual({});
  });
});
