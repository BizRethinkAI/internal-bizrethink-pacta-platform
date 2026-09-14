import { describe, expect, it } from 'vitest';
import { disclosureReading } from '../server-only/disclosure-reading';

describe('disclosure reading scope', () => {
  it('never treats a path or unknown slug as a source request', () => {
    expect(disclosureReading('../../etc/passwd')).toBeNull();
    expect(disclosureReading('missing')).toBeNull();
  });
  it('keeps the prescribed rows separate from their bounded source passage', () => {
    const view = disclosureReading('ca-offer-summary');
    expect(view?.rows.length).toBeGreaterThan(0);
    expect(view?.passage).toContain('914');
    expect(view?.wholeSource.length).toBeGreaterThan(view?.passage?.length ?? 0);
    expect(disclosureReading('ny-offer-summary')?.rows.some((row) => row.providerDrafted.length > 0)).toBe(true);
  });
  it('retains required calculation relationships and content evidence for review', () => {
    const itemization = disclosureReading('ca-itemization');
    expect(itemization?.rows.some((row) => row.calculation?.kind === 'difference')).toBe(true);
    const content = disclosureReading('ks-disclosure');
    expect(content?.rows.some((row) => row.labelPrescribed && row.evidence.length > 0)).toBe(true);
  });
});
