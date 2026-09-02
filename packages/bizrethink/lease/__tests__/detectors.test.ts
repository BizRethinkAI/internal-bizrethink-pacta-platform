import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

const clause = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug);

/*
  SMOKE DETECTION.

  §83.51(2)(b) puts the duty to install working smoke detection at the start of
  a single-family or duplex tenancy on the LANDLORD. The library had no clause
  for it at all. The only occurrence of the word "smoke" anywhere was in the
  tenant's list of minor repairs — smoke-alarm batteries — so the document
  shifted the chore while never stating the duty it sits under.

  After a fire, that is the only sentence about smoke alarms in the lease, and
  it points at the tenant.
*/
describe('the landlord states the detection duty before delegating the chore', () => {
  const detectors = clause('maintenance.detectors');

  it('exists', () => {
    expect(detectors).toBeDefined();
  });

  it('cites the subsection that imposes it', () => {
    expect(detectors?.requiredBy).toMatch(/83\.51\(2\)/);
  });

  it('puts installation and working order on the landlord', () => {
    expect(detectors?.body).toMatch(/Landlord shall install/i);
    expect(detectors?.body).toMatch(/working order/i);
  });

  it('covers carbon monoxide as well as smoke', () => {
    // The property burns natural gas, and a 2018 build carries the requirement.
    expect(detectors?.body).toMatch(/carbon monoxide/i);
  });

  it('keeps the tenant on testing and batteries, and forbids disabling', () => {
    const body = detectors?.body ?? '';

    expect(body).toMatch(/test/i);
    expect(body).toMatch(/batter/i);
    expect(body).toMatch(/disable|remove/i);
  });

  it('applies to a single-family home', () => {
    expect(detectors?.includeWhen?.({ propertyType: 'single-family' } as never)).toBe(true);
  });
});
