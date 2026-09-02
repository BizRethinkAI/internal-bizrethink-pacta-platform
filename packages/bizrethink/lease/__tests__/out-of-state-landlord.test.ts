import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

const clause = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug);

/*
  A LANDLORD WHO DOES NOT LIVE IN THE STATE.

  §83.50 lets the landlord name any person to receive notices, so an
  out-of-state address is lawful. Three clauses quietly assumed it would be
  local, and the fix for each is a wording change rather than the Florida agent
  the address field seems to demand:

    - A lockout fee payable "where Landlord or Landlord's agent attends". No
      agent is named, and nobody is driving from another state to open a door.
      On a house with two entrances and two separate garages a lockout is close
      to impossible in any case.

    - A three-day deemed-postal-receipt rule, written for local mail, now
      governing post in BOTH directions — including the tenant's own statutory
      notices to the landlord, whose clocks lose the difference each way.

    - A duty to forward association notices within a fixed number of hours,
      which post cannot satisfy across a state line.

  The charges clause also carried a $200 key fee "or the actual replacement cost
  if greater". A floor plus actual-cost recovery is a one-way election, which is
  what makes a liquidated sum a penalty instead. Charge the documented cost.
*/
describe('the charges clause survives an out-of-state landlord', () => {
  const charges = () => clause('fees.administrative')?.body ?? '';

  it('no longer charges for attendance nobody can perform', () => {
    expect(charges()).not.toMatch(/lockout/i);
  });

  it('no longer charges the tenant for declining entry', () => {
    // A flat fee for saying "not today" contemplates no loss. That is a
    // penalty, and it is the sentence a judge reads aloud.
    expect(charges()).not.toMatch(/fails to permit access/i);
  });

  it('charges the documented cost of a key rather than a floor plus costs', () => {
    expect(charges()).not.toMatch(/if greater/i);
    expect(charges()).toMatch(/actual/i);
  });

  it('stops asking for the three amounts it no longer prints', () => {
    const names = clause('fees.administrative')?.variables.map((v) => v.name) ?? [];

    expect(names).not.toContain('lockoutFeeUsd');
    expect(names).not.toContain('inspectionRefusalFeeUsd');
    expect(names).not.toContain('keyReplacementFeeUsd');
  });
});

describe('notice clauses that work across a state line', () => {
  it('allows post the time post actually takes', () => {
    const body = clause('notices.method')?.body ?? '';

    expect(body).not.toMatch(/third day after posting/i);
    expect(body).toMatch(/fifth day after posting/i);
  });

  it('still leaves statutory service alone', () => {
    // §83.56 service is not ours to redefine, whatever the parties agree.
    expect(clause('notices.method')?.body).toMatch(/§83\.56/);
  });

  it('lets association notices be forwarded by email', () => {
    const body = clause('hoa.compliance')?.body ?? '';

    expect(body).toMatch(/email/i);
  });
});
