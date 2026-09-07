import type { Authority, Jurisdiction, Rate, TransactionRegularity } from './types';

/**
 * APR tolerances, per state, from that state's own vendored text.
 *
 * THE STATES DIFFER AND THE COMPUTATION SPEC SAYS THEY DO NOT.
 *
 * DISCLOSURE-COMPUTATION-SPEC.md opens with "California and New York define
 * these terms in identical words, so one spec serves both forms. Where they
 * differ, it is called out." Under "The tolerance is one-sided" it then says
 * "Nothing in §955 forgives a disclosed rate above the calculated one. A
 * symmetric assertion is therefore wrong in one direction."
 *
 * That is correct for California. 10 CCR §955(a)(1)-(2) say "below". It is not
 * correct for New York: 23 NYCRR §600.4(a)(1)-(2) say "above or below". The
 * divergence is not called out in the spec, and `lombard-platform`'s
 * `withinSection955Tolerance` takes no jurisdiction argument, so California's
 * rule is what New York gets. That direction is the safe one — it is stricter
 * than New York requires, so it cannot produce an unlawful New York disclosure
 * — but it is still one state's rule applied to another state's document, which
 * is the failure mode the jurisdiction axis exists to make impossible. Reported
 * rather than silently followed or silently fixed.
 */
export type ToleranceRule = {
  jurisdiction: Jurisdiction;
  citation: string;
  sourceFile: string;
  quotes: Authority[];
  /**
   * Whether the state's bands are symmetric. California's are not: a disclosed
   * rate above the calculated one is outside §955(a) however small the gap.
   */
  forgivesOverstatement: boolean;
  /** (a)(1): 1/8 of 1 percentage point. */
  regularPoint: Rate;
  /** (a)(2): 1/4 of 1 percentage point, irregular transactions. */
  irregularPoint: Rate;
  /** (a)(3): the relative test, 2.5%. */
  relative: number;
};

const caQuote = (citation: string, text: string): Authority => ({
  citation,
  text,
  sourceFile: 'CA-10CCR-900-956.txt',
  jurisdiction: 'CA',
});

const nyQuote = (citation: string, text: string): Authority => ({
  citation,
  text,
  sourceFile: 'NY-23NYCRR-600.txt',
  jurisdiction: 'NY',
});

export const TOLERANCE_RULES: Record<Jurisdiction, ToleranceRule> = {
  CA: {
    jurisdiction: 'CA',
    citation: '10 CCR §955',
    sourceFile: 'CA-10CCR-900-956.txt',
    quotes: [
      caQuote(
        '10 CCR §955(a)(1)',
        'It is not more than 1/8 of 1 percentage point below the annual percentage rate determined in accordance with subdivision (a) of section 940',
      ),
      caQuote(
        '10 CCR §955(a)(2)',
        'In an irregular transaction, it is not more than ¼ of 1 percentage point below the annual percentage rate determined in accordance with subdivision (a) of section 940.',
      ),
      caQuote(
        '10 CCR §955(c)',
        'or prepayment fee or charge that exceeds the amount that the provider is required to disclose under this subchapter.',
      ),
    ],
    forgivesOverstatement: false,
    regularPoint: 0.00125,
    irregularPoint: 0.0025,
    relative: 0.025,
  },
  NY: {
    jurisdiction: 'NY',
    citation: '23 NYCRR §600.4',
    sourceFile: 'NY-23NYCRR-600.txt',
    quotes: [
      nyQuote(
        '23 NYCRR §600.4(a)(1)',
        'it is not more than one-eighth of one percentage point above or below the annual percentage rate determined in accordance with section 600.3(b)',
      ),
      nyQuote(
        '23 NYCRR §600.4(a)(2)',
        'in an irregular transaction, it is not more than one-fourth of one percentage point above or below the annual percentage rate determined in accordance with section 600.3(b).',
      ),
    ],
    forgivesOverstatement: true,
    regularPoint: 0.00125,
    irregularPoint: 0.0025,
    relative: 0.025,
  },
};

/**
 * OUR READING of §955(a)(3), recorded because it is a reading and not the text.
 *
 * Both states word the relative test one-directionally: subtract the disclosed
 * rate from the calculated one, divide by the disclosed rate, and ask whether
 * the result is "2.5 percent or less". Read literally that arithmetic is
 * satisfied by ANY overstatement, however large, because the difference goes
 * negative — which would make California's "below" in (a)(1) and (a)(2) do no
 * work at all. We therefore read (a)(3) as extending the permitted band in the
 * same direction(s) the point tests do, and no further.
 *
 * This is the second-weakest reading available and it is deliberate: the
 * alternative (treating (a)(3) as a magnitude test) would forgive a 2.4%
 * relative OVERSTATEMENT in California, which nothing in the text says. Flagged
 * for counsel; see UNRESOLVED_READINGS in `identities.ts`.
 */
export const RELATIVE_TEST_FOLLOWS_POINT_TEST_DIRECTION = true;

/**
 * The band of TRUE (calculated) rates a given disclosed rate is accurate for.
 *
 * Stated in this direction because that is the direction the check runs: the
 * filled document carries the disclosed figure and the question is which
 * calculated rates it stands for. Inverting it lets the APR round-trip be
 * decided by two present-value evaluations and no root-finding at all — see
 * `checkApr` in `apr.ts`.
 */
export const permittedCalculatedBand = (
  rule: ToleranceRule,
  disclosed: Rate,
  regularity: TransactionRegularity,
): { min: Rate; max: Rate } => {
  const point = regularity === 'irregular' ? rule.irregularPoint : rule.regularPoint;
  // (a)(1)/(a)(2) and (a)(3) are alternatives joined by "or", so the widest of
  // them governs.
  const band = Math.max(point, rule.relative * Math.abs(disclosed));

  return {
    // The relative test extends the band in whichever direction(s) that state's
    // POINT tests allow, per RELATIVE_TEST_FOLLOWS_POINT_TEST_DIRECTION above.
    // California's point tests say "below", so nothing extends downward at all
    // and the floor is the disclosed rate itself. New York's say "above or
    // below", so the same widened band applies on both sides — using the bare
    // point band for New York's floor would be stricter than §600.4 requires
    // and would contradict the reading this file states.
    min: rule.forgivesOverstatement ? disclosed - band : disclosed,
    max: disclosed + band,
  };
};
