import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

import type { LegalReading } from '../../legal-ui/reading';
import { ALL_MCA_CONTENT, contentFor } from '../catalogue';
import { LOMBARD_FACTS } from '../clauses/facts';
import type { McaInstrument } from '../clauses/instruments';
import { libraryFor } from '../clauses/library';
import { numberClauses, referencedInstruments } from '../engine/number-clauses';
import { referenceSegments } from '../engine/reference-segments';
import { reviewExamples, reviewProfileDescription } from './numbered-library';

const examples = [{ facts: LOMBARD_FACTS, label: 'Example selection' }, ...reviewExamples(LOMBARD_FACTS)];

/** Resolve raw tokens after substitutions. The plain compiler and stored snapshots remain unchanged. */
export const readingForReview = (
  slug: string,
  transform: (text: string) => string = (text) => text,
  selection?: string,
): LegalReading => {
  const source = ALL_MCA_CONTENT.find((entry) => entry.slug === slug);
  const example = selection
    ? examples.find((entry) => reviewProfileDescription(entry.facts) === selection)
    : examples.find((entry) => !source?.includeWhen || source.includeWhen(entry.facts));
  if (!source || !example) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'No reading context exists for this item.' });
  }
  const contextKey = reviewProfileDescription(example.facts);
  const instruments = [...new Set([source.instrument, ...referencedInstruments([source])])];
  const context = instruments.flatMap((instrument) =>
    numberClauses(libraryFor(instrument).filter((entry) => !entry.includeWhen || entry.includeWhen(example.facts))),
  );
  return {
    number: context.find((entry) => entry.slug === slug)?.number ?? null,
    context: contextKey,
    segments: referenceSegments({ ...source, body: transform(source.body) }, context, contextKey),
  };
};

/** Only requested instruments enter this projection; recipient scope never widens through a reference. */
export const readingContextsForReview = (
  instruments: McaInstrument[],
  transform: (text: string) => string = (text) => text,
): Record<string, Record<string, LegalReading>> => {
  const items = instruments.flatMap(contentFor);
  const contexts = [...new Set(items.map((item) => readingForReview(item.slug).context))];
  return Object.fromEntries(
    contexts.map((context) => {
      const example = examples.find((entry) => reviewProfileDescription(entry.facts) === context);
      return [
        context,
        Object.fromEntries(
          items
            .filter((item) => example && (!item.includeWhen || item.includeWhen(example.facts)))
            .map((item) => [item.slug, readingForReview(item.slug, transform, context)]),
        ),
      ];
    }),
  );
};
