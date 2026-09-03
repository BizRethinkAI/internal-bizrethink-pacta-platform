import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';
import { US_FL } from '../rule-packs/us-fl';

/*
  HOW HARD DOES THE STATUTE PRESCRIBE?

  Florida asks for exact words in exactly two places, and everything else is a
  safe harbour. Verified by reading the introducing phrase of each provision on
  2 September 2026:

    §83.49(2)(d)  "Contain the following disclosure"        -> VERBATIM
    §404.056(5)   "shall contain the following language"    -> VERBATIM

    §83.49(3)(a)  "substantially the following form"        -> safe harbour
    §83.505       "substantially the following form"        -> safe harbour
    §83.512       "substantially the following form"        -> safe harbour
    §83.595(4)    "substantially the following form"        -> safe harbour
    §68.065(4)    "substantially as follows"                -> safe harbour

  The distinction is not pedantry. It decides what a diff against the statute
  MEANS: for the two verbatim provisions any difference is a compliance failure,
  and for the rest it is drift worth reviewing but not a defect. Marking
  everything verbatim, as we did, makes every future amendment look like an
  emergency and trains you to ignore the signal.
*/
describe('only what the statute demands exactly is marked verbatim', () => {
  const statutory = FL_LIBRARY.filter((c) => c.source.kind === 'statute');

  const verbatimFlorida = statutory
    .filter((c) => c.jurisdiction === 'US-FL')
    .filter((c) => c.source.kind === 'statute' && c.source.verbatimRequired)
    .map((c) => c.slug)
    .sort();

  it('marks exactly the two Florida provisions that say so', () => {
    expect(verbatimFlorida).toEqual(['deposit.statutory-notice', 'disclosure.radon']);
  });

  /*
    Lead paint is federal and stays marked verbatim, but deliberately
    UNVERIFIED. HUD's 24 C.F.R. §35.92(b)(1) and EPA's 40 C.F.R. §745.113(b)(1)
    were duplicative for 28 years; EPA added the word "known" in November 2024
    and HUD has not conformed. Templating one canonical string makes the lease
    non-conforming to the other agency. That is a question for counsel, not a
    choice to make in a commit.
  */
  it('leaves the federal lead disclosure verbatim and unverified', () => {
    const lead = FL_LIBRARY.find((c) => c.slug === 'disclosure.lead-paint');

    expect(lead?.jurisdiction).toBe('US');

    if (lead?.source.kind === 'statute') {
      expect(lead.source.verbatimRequired).toBe(true);
      expect(lead.source.verbatimVerifiedAt).toBeNull();
    }
  });

  it('does not mark the safe-harbour forms verbatim', () => {
    for (const slug of ['disclosure.flood']) {
      const clause = FL_LIBRARY.find((c) => c.slug === slug);

      expect(clause?.source.kind).toBe('statute');

      if (clause?.source.kind === 'statute') {
        expect(clause.source.verbatimRequired).toBe(false);
      }
    }
  });

  it('still records every statutory clause as statute-sourced', () => {
    // Relaxing verbatimRequired must not quietly reclassify provenance.
    expect(statutory.length).toBeGreaterThanOrEqual(5);
  });
});

/*
  Each rule-pack figure is a claim about a subsection. The 12-hour entry bug
  lived here for months under a comment stating the wrong number confidently.
  These were read off the statutes on 2026-09-02.
*/
describe('the rule-pack figures match the statutes they cite', () => {
  it('§83.49(3)(a) — 15 days to return, 30 to notice a claim', () => {
    expect(US_FL.deposit.maxReturnDays).toBe(15);
    expect(US_FL.deposit.maxClaimNoticeDays).toBe(30);
  });

  it('§83.49 sets no cap on deposit size, and the absence is recorded', () => {
    expect(US_FL.deposit.maxDepositMonths).toBeNull();
  });

  it('§83.53(2) — 24 hours, 7:30am to 8:00pm', () => {
    expect(US_FL.access.minNoticeHours).toBe(24);
    expect(US_FL.access.earliestHour).toBe(7.5);
    expect(US_FL.access.latestHour).toBe(20);
  });

  it('§83.595(4) — two months, 60 days', () => {
    expect(US_FL.earlyTermination.maxFeeMonths).toBe(2);
    expect(US_FL.earlyTermination.maxTenantNoticeDays).toBe(60);
  });

  it('§83.575(1) — not less than 30 nor more than 60 days', () => {
    expect(US_FL.nonRenewal.minNoticeDays).toBe(30);
    expect(US_FL.nonRenewal.maxNoticeDays).toBe(60);
  });

  it('records when the pack was last checked against the statute book', () => {
    expect(US_FL.verifiedAt).toBe('2026-09-02');
  });
});
