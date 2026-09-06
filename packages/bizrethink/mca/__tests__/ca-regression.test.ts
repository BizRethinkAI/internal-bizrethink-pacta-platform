import { describe, expect, it } from 'vitest';
import { checkFormConformity } from '../prescribed/conformity';
import { CA_OFFER_SUMMARY } from '../prescribed/forms/ca-offer-summary';
import asPublished from './ca-rows.as-published-104.fixture.json';

/*
  The California disclosure EXACTLY as it was published to Pacta as templates
  104 and 105, carrying the two defects this checker found on 2026-09-06.

  Kept deliberately. A conformity checker earns trust by catching something that
  really went out, not by passing on text written to make it pass — so if a
  future refactor stops flagging these, the checker has quietly stopped working
  and this test is what says so.

    row 0  10 CCR §914(a)(2)(C)(ii) prescribes "on what amounts will be
           deducted". The form carried 23 NYCRR §600.6(b)'s phrasing, "on the
           amounts that will be deducted" — the New York sentence in the
           California form. §914(a)(2) closes that row with "shall include only".

    row 8  §914(a)(10) closes the eighth row the same way. A cross-form sweep
           added a prepayment-discount sentence to all eleven states at once,
           which nine of them wanted and CA and NY could not lawfully take.
*/
describe('CA disclosure as published (templates 104/105)', () => {
  const divergences = checkFormConformity(CA_OFFER_SUMMARY, asPublished);

  it('flags New York wording in the California funding row', () => {
    expect(divergences.some((d) => d.row === 0 && d.detail.includes('the amounts that will be deducted'))).toBe(true);
  });

  it('flags the prepayment-discount sentence in the closed eighth row', () => {
    expect(divergences.some((d) => d.row === 8 && d.detail.includes('prepayment discount'))).toBe(true);
  });

  it('finds exactly these two and no others', () => {
    expect(divergences.map((d) => d.row).sort()).toEqual([0, 8]);
  });
});
