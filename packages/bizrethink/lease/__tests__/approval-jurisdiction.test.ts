import { describe, expect, it } from 'vitest';

import { admissionBlocks, normaliseBarJurisdiction } from '../clauses/approval-jurisdiction';

/**
 * An attorney may approve a clause only where they are admitted.
 *
 * The approval model recorded a bar NUMBER but never which bar, so nothing
 * could have objected to a Florida attorney approving a North Carolina clause —
 * and with North Carolina next, that stops being hypothetical. There are zero
 * approvals recorded today, which is the only reason this is a field addition
 * rather than a migration.
 *
 * The rule is deliberately narrow: it governs which clauses a given admission
 * covers. Whether a US attorney may approve the generic tier at all is a
 * question for counsel, not for this file, and until it comes back the
 * permissive reading is the one that matches how the library is built — generic
 * clauses depend on no state's law.
 */

describe('normaliseBarJurisdiction', () => {
  /*
    Typed by a human on behalf of an attorney, so it arrives however they wrote
    it. The stored value has to match the clause's `jurisdiction` exactly or the
    comparison silently never fires.
  */
  it('accepts the forms a person actually types', () => {
    for (const input of ['FL', 'fl', 'US-FL', 'us-fl', ' Fl ', 'Florida', 'florida']) {
      expect(normaliseBarJurisdiction(input), input).toBe('US-FL');
    }
  });

  it('handles the second state the same way', () => {
    for (const input of ['NC', 'us-nc', 'North Carolina', 'north carolina']) {
      expect(normaliseBarJurisdiction(input), input).toBe('US-NC');
    }
  });

  it('returns null for something it does not recognise, rather than guessing', () => {
    expect(normaliseBarJurisdiction('')).toBeNull();
    expect(normaliseBarJurisdiction('Ontario')).toBeNull();
    expect(normaliseBarJurisdiction('bar #12345')).toBeNull();
  });
});

describe('admissionBlocks', () => {
  it('lets a Florida attorney approve a Florida clause', () => {
    expect(admissionBlocks('US-FL', 'US-FL')).toBeNull();
  });

  it('stops a Florida attorney approving a North Carolina clause', () => {
    const blocked = admissionBlocks('US-NC', 'US-FL');

    expect(blocked).toMatch(/North Carolina/);
    expect(blocked).toMatch(/Florida/);
  });

  /*
    Federal and generic clauses depend on no single state's law, so any US
    admission covers them. This is the reading counsel is being asked to
    confirm; if they say otherwise it changes here and nowhere else.
  */
  it('lets any US admission approve federal and generic clauses', () => {
    expect(admissionBlocks('US', 'US-FL')).toBeNull();
    expect(admissionBlocks('generic', 'US-NC')).toBeNull();
  });

  it('refuses when the approver has no recorded admission', () => {
    expect(admissionBlocks('US-FL', null)).toMatch(/admission|jurisdiction/i);
  });
});
