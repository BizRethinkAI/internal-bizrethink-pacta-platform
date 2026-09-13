import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

import { LOMBARD_FACTS, type McaFacts } from '../clauses/facts';
import type { McaInstrument } from '../clauses/instruments';
import { inReviewOrder, libraryFor } from '../clauses/library';
import type { McaReusableContent } from '../clauses/types';
import { numberClauses, referencedInstruments, resolveReferences } from '../engine/number-clauses';
import { numberedLibraryForReview, type ReviewMcaClause, reviewExamples } from '../review/numbered-library';
import { reusableFor } from './library';

export type ReviewMcaReusable = McaReusableContent & {
  number: null;
  sectionNumber: string;
  included: boolean;
  selectionNote: string | null;
};
export type ReviewMcaContent = ReviewMcaClause | ReviewMcaReusable;

export const reusableForReview = (instrument: McaInstrument, facts: McaFacts = LOMBARD_FACTS): ReviewMcaReusable[] =>
  reusableFor(instrument).map((entry) => {
    const included = entry.includeWhen === null || entry.includeWhen(facts);
    const example = included
      ? { facts, label: '' }
      : reviewExamples(facts).find(({ facts: candidate }) => entry.includeWhen?.(candidate));
    if (!example) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, { message: `No review example selects ${entry.slug}.` });
    }
    const instruments = [...new Set([instrument, ...referencedInstruments([entry])])];
    const context = instruments.flatMap((id) =>
      numberClauses(
        libraryFor(id).filter((clause) => clause.includeWhen === null || clause.includeWhen(example.facts)),
      ),
    );
    const [resolved] = resolveReferences([entry], context);
    return {
      ...resolved,
      number: null,
      sectionNumber:
        context.find((clause) => clause.instrument === instrument && clause.section === entry.section)?.sectionNumber ??
        '',
      included,
      selectionNote: included
        ? null
        : `Alternative — ${example.label}. References apply to this alternative's example selection.`,
    };
  });

/** Counsel sees the whole scoped content set, with each catalogue identified. */
export const contentForReview = (instrument: McaInstrument, facts: McaFacts = LOMBARD_FACTS): ReviewMcaContent[] =>
  inReviewOrder([...numberedLibraryForReview(instrument, facts), ...reusableForReview(instrument, facts)]);
