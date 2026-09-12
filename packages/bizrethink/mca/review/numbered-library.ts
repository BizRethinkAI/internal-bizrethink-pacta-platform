import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

import { LOMBARD_FACTS, type McaFacts } from '../clauses/facts';
import type { McaInstrument } from '../clauses/instruments';
import { inReviewOrder } from '../clauses/library';
import type { SelectedMcaClause } from '../engine/number-clauses';
import { selectClauses } from '../engine/select-clauses';
import { JURISDICTION_NAMES, MCA_JURISDICTIONS } from '../jurisdictions';

export type ReviewMcaClause = SelectedMcaClause & {
  included: boolean;
  selectionNote: string | null;
};

// Review examples, not new commercial defaults. Current gates each decide a
// whole clause from one fact (ADR 0013). New combinations must be added here
// explicitly if a future gate cannot be demonstrated by changing one answer.
const REVIEW_OPTIONS = {
  collectionMethod: [
    ['split-only', 'Split collections'],
    ['ach-only', 'ACH collections'],
    ['split-with-ach-backstop', 'Split collections with ACH backstop'],
  ],
  settlementBase: [
    ['net', 'Net settlement base (unconfirmed)'],
    ['gross', 'Gross settlement base (unconfirmed)'],
  ],
  guarantyScope: [
    ['none', 'No guaranty'],
    ['limited-conduct', 'Limited conduct guaranty'],
    ['full-performance', 'Full performance guaranty'],
  ],
  equipment: [
    ['none', 'No equipment'],
    ['merchant-elects', 'Merchant elects equipment purchase or lease'],
  ],
  renewalModel: [
    ['none', 'No renewals'],
    ['payoff-only', 'Payoff-only renewals'],
    ['carry', 'Carry renewals'],
  ],
  concurrentPositions: [
    [false, 'One active position'],
    [true, 'Concurrent positions'],
  ],
  disputeResolution: [
    ['courts', 'Court disputes'],
    ['arbitration', 'Arbitration'],
  ],
  venueRule: [
    ['merchant-state', 'Merchant-state venue'],
    ['funder-state', 'Funder-state venue'],
  ],
  recipientStates: [
    [[], 'No recipient states'],
    ...MCA_JURISDICTIONS.map((state): [McaFacts['recipientStates'], string] => [
      [state],
      `${JURISDICTION_NAMES[state]} recipients`,
    ]),
  ],
  brokerChannel: [
    [false, 'No broker channel'],
    [true, 'Broker channel'],
  ],
  consumerReportPulled: [
    [false, 'No consumer report'],
    [true, 'Consumer report'],
  ],
  processorSplitAccepted: [
    [false, 'Processor split acceptance not assumed'],
    [true, 'Processor split accepted'],
  ],
} satisfies { [K in keyof McaFacts]: [McaFacts[K], string][] };

export const reviewProfileDescription = (facts: McaFacts = LOMBARD_FACTS): string =>
  Object.entries(REVIEW_OPTIONS)
    .map(([key, options]) => {
      const value = facts[key as keyof McaFacts];
      if (key === 'recipientStates') {
        return facts.recipientStates.map((state) => JURISDICTION_NAMES[state]).join(', ') + ' recipients';
      }
      return options.find(([option]) => option === value)?.[1];
    })
    .join('; ');

/**
 * Show the full corpus without pretending mutually exclusive clauses form one
 * agreement. Base rows use the example selection's citations. Each excluded
 * row is compiled in a named alternative selection that actually contains it.
 */
export const numberedLibraryForReview = (
  instrument: McaInstrument,
  facts: McaFacts = LOMBARD_FACTS,
): ReviewMcaClause[] => {
  const base = selectClauses({ instrument, facts });
  const selected: ReviewMcaClause[] = base.selected.map((clause) => ({
    ...clause,
    included: true,
    selectionNote: null,
  }));
  const examples = Object.entries(REVIEW_OPTIONS).flatMap(([key, options]) =>
    options.map(([value, label]) => ({ facts: { ...facts, [key]: value }, label })),
  );

  for (const { clause } of base.excluded) {
    const example = examples.find(({ facts: candidate }) => clause.includeWhen?.(candidate));
    if (!example) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, { message: `No review example selects ${clause.slug}.` });
    }
    const alternative = selectClauses({ instrument, facts: example.facts }).selected.find(
      (candidate) => candidate.slug === clause.slug,
    );
    if (!alternative) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, { message: `Review example did not select ${clause.slug}.` });
    }
    selected.push({
      ...alternative,
      included: false,
      selectionNote: `Alternative — ${example.label}. Citations apply to this alternative's example selection.`,
    });
  }
  return inReviewOrder(selected);
};
