import { describe, expect, it } from 'vitest';

import { canDeleteMatter } from '../matters/lifecycle';

/**
 * What may be thrown away, and what may not.
 *
 * A draft nobody has seen is a scratch pad — two identical ones accumulate
 * from ten minutes of trying the interview out, and being unable to remove
 * them makes the list useless.
 *
 * A lease that has been SENT is not a scratch pad. Recipients hold links to
 * it, an envelope exists, and the audit trail of a document out for signature
 * is not the landlord's to erase by clicking a bin. That refusal is here
 * rather than in a route handler because it is a rule about the domain, and
 * because a rule that lives in one button is a rule the next button forgets.
 */

describe('canDeleteMatter', () => {
  it('allows an untouched draft', () => {
    expect(canDeleteMatter({ status: 'draft', envelopeId: null }).ok).toBe(true);
  });

  it('refuses a lease that has been sent', () => {
    const result = canDeleteMatter({ status: 'sent', envelopeId: 'env_1' });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason.toLowerCase()).toMatch(/sent|signature/);
  });

  it('refuses an executed lease', () => {
    expect(canDeleteMatter({ status: 'executed', envelopeId: 'env_1' }).ok).toBe(false);
  });

  it('refuses a draft that somehow already has an envelope', () => {
    /*
      Belt and braces. Status and envelopeId are written together, but if they
      ever disagreed the envelope is the fact that matters — a document exists
      and people may hold links to it.
    */
    expect(canDeleteMatter({ status: 'draft', envelopeId: 'env_1' }).ok).toBe(false);
  });

  it('refuses anything that is not a draft, including states not yet invented', () => {
    for (const status of ['ready', 'abandoned', 'something-new']) {
      expect(canDeleteMatter({ status, envelopeId: null }).ok, status).toBe(false);
    }
  });

  it('explains the refusal in terms of what happened, not a status code', () => {
    const result = canDeleteMatter({ status: 'sent', envelopeId: 'env_1' });

    expect(!result.ok && result.reason).not.toMatch(/^status/i);
    expect(!result.ok && result.reason.length).toBeGreaterThan(20);
  });
});
