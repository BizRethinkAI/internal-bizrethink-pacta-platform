import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';
import { DEPOSIT_STATUTORY_NOTICE, RADON_STATUTORY_TEXT } from '../clauses/us-fl/statutory-disclosures';

const clause = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug);

/*
  TEXT READ OFF THE STATUTE, NOT OFF OURSELVES.

  The previous control for this was a test asserting our constant equalled a
  hardcoded copy of the same string, written from the same memory. It carried a
  comment calling itself "the actual compliance control". It could only ever
  catch an accidental edit — never the case where the original was wrong, which
  is exactly what had happened.

  The strings below were fetched from the Florida Senate's published statutes
  on 2 September 2026:

    §83.49(2)(d)  https://www.flsenate.gov/Laws/Statutes/2025/0083.49
    §404.056(5)   https://www.flsenate.gov/Laws/Statutes/2025/404.056

  That does not make this test self-proving either — a future amendment moves
  the statute and leaves this file behind. What it does is pin the date and the
  source, so the next reader knows exactly what was checked and when.
*/

/*
  §83.49(2)(d) is one of only TWO Florida provisions that demand exact words:
  it says "Contain the following disclosure", with no "substantially". The
  other is radon. Everything else in this library is a safe-harbour form.

  What we shipped was the PRE-2025 text. Ch. 2025-16 (HB 615), effective
  1 July 2025, rewrote it to permit notice in person, by mail, or by e-mail
  under the new §83.505 — and our copy still said MAIL. It had been
  transcribed from an executed lease, and that lease predated the amendment.
*/
describe('§83.49(2)(d) deposit disclosure — verbatim required', () => {
  it('carries the post-2025 wording, not the old mail-only text', () => {
    expect(DEPOSIT_STATUTORY_NOTICE).toContain(
      'THE LANDLORD MUST PROVIDE YOU WRITTEN NOTICE IN PERSON, BY MAIL, OR BY E-MAIL IN ACCORDANCE WITH SECTION 83.505, FLORIDA STATUTES, WITHIN 30 DAYS AFTER YOU MOVE OUT',
    );
  });

  it('opens as the statute opens', () => {
    // The statute says RENTAL AGREEMENT. We had substituted LEASE.
    expect(DEPOSIT_STATUTORY_NOTICE.startsWith('YOUR RENTAL AGREEMENT REQUIRES PAYMENT OF CERTAIN DEPOSITS.')).toBe(
      true,
    );
  });

  it('says WRITTEN notice in both places the statute does', () => {
    expect(DEPOSIT_STATUTORY_NOTICE).toContain("RECEIPT OF THE LANDLORD'S WRITTEN NOTICE");
    expect(DEPOSIT_STATUTORY_NOTICE).toContain('IF THE LANDLORD FAILS TO TIMELY PROVIDE YOU NOTICE');
  });

  it('no longer contains the superseded phrasings', () => {
    for (const stale of [
      'YOUR LEASE REQUIRES',
      'THE LANDLORD MUST MAIL YOU NOTICE',
      'FAILS TO TIMELY MAIL YOU NOTICE',
    ]) {
      expect(DEPOSIT_STATUTORY_NOTICE).not.toContain(stale);
    }
  });

  it('cites the subsection that actually prescribes it', () => {
    /*
      We cited §83.49(3). That subsection is the notice of intent to impose a
      claim, which is a DIFFERENT document and only has to be in "substantially
      the following form". The all-caps disclosure is (2)(d).
    */
    expect(clause('deposit.statutory-notice')?.source).toMatchObject({
      kind: 'statute',
      citation: 'Fla. Stat. §83.49(2)(d)',
      verbatimRequired: true,
    });
  });
});

describe('§404.056(5) radon — verbatim required', () => {
  it('matches the statute', () => {
    expect(RADON_STATUTORY_TEXT).toBe(
      'RADON GAS: Radon is a naturally occurring radioactive gas that, when it has accumulated in a building in sufficient quantities, may present health risks to persons who are exposed to it over time. Levels of radon that exceed federal and state guidelines have been found in buildings in Florida. Additional information regarding radon and radon testing may be obtained from your county health department.',
    );
  });
});

/*
  `verbatimVerifiedAt` has existed since the library was written and had never
  been set on anything. A null there means "nobody has checked this against the
  statute book" — which was true of all six, and of one it was worse than that.
*/
describe('what has actually been verified', () => {
  const verified = FL_LIBRARY.filter((c) => c.source.kind === 'statute' && c.source.verbatimVerifiedAt !== null).map(
    (c) => c.slug,
  );

  it('records a date on the two we read off the statute', () => {
    expect(verified.sort()).toEqual(['deposit.statutory-notice', 'disclosure.radon']);
  });

  it('leaves the rest honestly unverified', () => {
    const unverified = FL_LIBRARY.filter((c) => c.source.kind === 'statute' && c.source.verbatimVerifiedAt === null);

    // Flood, lead paint and the e-notice addendum are still outstanding. This
    // assertion exists so that number cannot drift up unnoticed.
    expect(unverified.length).toBe(4);
  });
});
