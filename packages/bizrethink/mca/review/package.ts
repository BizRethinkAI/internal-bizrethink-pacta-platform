import { createHash } from 'node:crypto';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { ALL_MCA_CONTENT, contentFor } from '../catalogue';
import { mcaClauseFingerprint } from '../clauses/approval';
import { INSTRUMENTS, MCA_INSTRUMENTS } from '../clauses/instruments';
import { type McaTenant, resolveClauses, resolveParties } from '../clauses/parties';
import { MCA_JURISDICTIONS } from '../jurisdictions';
import { readSourceText, sourceExists } from '../provenance/source-text';
import { disclosuresFor } from '../registry';
import { contentForReview } from '../reusable/review';
import { entryFor } from '../surface/view';
import { reviewProfileDescription } from './numbered-library';
import { type McaReviewPackage, ZReviewPackage } from './package-schema';
import { toReadableAgreement } from './readable-agreement';
import { readingContextsForReview, readingForReview } from './reading-presentation';

const NEUTRAL_ROLES: McaTenant = {
  id: 'shared-library',
  parties: { funder: '[Buyer legal name]', equipmentAffiliate: '[Equipment provider legal name]', processor: 'Payzli' },
  documents: {},
};
// JSONB reorders object keys. Legal reading order lives in arrays and stays significant.
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, canonical(child)]),
    );
  }
  return value;
};
const hash = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
export const reviewPackageFingerprint = (snapshot: McaReviewPackage) => hash(snapshot);

export const readReviewPackage = (value: unknown, fingerprint: string): McaReviewPackage => {
  const parsed = ZReviewPackage.safeParse(value);
  if (!parsed.success || hash(parsed.data) !== fingerprint) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'This review snapshot is unavailable.' });
  }
  return parsed.data;
};

/** Preserve every registry constraint, including empty/conditional cells, in readable source context. */
const paragraphs = (value: Record<string, unknown>): string[] =>
  Object.entries(value).map(([key, content]) => {
    const label = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
    const readable = (part: unknown): string => {
      if (part === null) {
        return 'Not prescribed / not recorded';
      }
      if (Array.isArray(part)) {
        return part.map(readable).join('; ') || 'None';
      }
      if (typeof part === 'object') {
        return paragraphs(part as Record<string, unknown>).join('; ');
      }
      return String(part);
    };
    return `${label}: ${readable(content)}`;
  });

export const reviewRequirements = (): McaReviewPackage['requirements'] =>
  MCA_JURISDICTIONS.flatMap((state) =>
    disclosuresFor(state).map((spec) => {
      // Age is displayed relative to these dates by the reader. It must not mutate a snapshot each midnight.
      const entry = entryFor(spec);
      const rows = 'rows' in spec ? spec.rows : 'lines' in spec ? spec.lines : spec.requirements;
      const header = sourceExists(spec.sourceFile) ? readSourceText(spec.sourceFile).split('\n').slice(0, 80) : [];
      // Preserve recorded fetch locations/dates without exposing internal editorial history.
      const retrieval = header.filter((line) =>
        /^\s*(?:Retrieved from|Retrieved at[^:]*|Source URL|Fetched from|Official link context)\s*:/i.test(line),
      );
      const evidence = [
        ...retrieval,
        entry.originEvidence ?? entry.originWhy,
        ...(retrieval.some((line) => /(?:Retrieved from|Source URL|Fetched from)\s*:\s*https?:/i.test(line))
          ? []
          : [
              'The exact retrieval URL is not recorded in this source header; publisher links identify the publisher, not the original fetch.',
            ]),
      ].join('\n');
      return {
        slug: spec.slug,
        jurisdiction: spec.jurisdiction,
        jurisdictionName: entry.jurisdictionName,
        citation: spec.citation,
        kind: entry.kind,
        transaction:
          'transaction' in spec
            ? spec.transaction
            : 'Covered commercial financing; determine applicability per transaction',
        sourceDigest: spec.sourceDigest,
        observedDigest: entry.observedDigest,
        sourceEvidence: evidence,
        sourceUrls: [...new Set(evidence.match(/https?:\/\/[^\s<>")]+/g) ?? [])],
        lastReadAt: entry.lastReadAt,
        verbatimVerifiedAt: entry.verbatimVerifiedAt,
        structureVerifiedAt: entry.structureVerifiedAt,
        limitations: [
          entry.originWhy,
          ...entry.problems.map((problem) => `${problem.kind}: ${problem.detail}`),
          ...entry.publishGate,
          ...entry.unreadable.map((item) => `${item.label}: ${item.why}`),
          'Scope, exemptions, effective dates and transaction figures require assessment; matching our saved source is not proof of current law.',
        ],
        entries: rows.map((row, index) => ({
          label:
            'label' in row ? row.label : 'description' in row ? (row.description ?? `Line ${index + 1}`) : row.citation,
          paragraphs: paragraphs(row),
        })),
      };
    }),
  );

export const buildLibraryReviewPackage = ({ contact }: { contact: string }): McaReviewPackage => {
  const transform = (text: string) => resolveParties(text, NEUTRAL_ROLES);
  return ZReviewPackage.parse({
    schemaVersion: 1,
    kind: 'library',
    title: 'Shared MCA library — complete counsel package',
    contact,
    profileDescription: reviewProfileDescription(),
    documents: MCA_INSTRUMENTS.map((instrument) => ({
      ...INSTRUMENTS[instrument],
      control: instrument === 'split-funding' ? 'processor-controlled' : 'authored',
      sections: toReadableAgreement(resolveClauses(contentForReview(instrument), NEUTRAL_ROLES)).map((section) => ({
        id: section.id,
        name: section.name,
        items: section.clauses.map((readable) => {
          const source = contentFor(instrument).find((item) => item.slug === readable.slug);
          if (!source) {
            throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Review content is missing.' });
          }
          return {
            ...readable,
            version: String(source.version),
            sourceFingerprint: mcaClauseFingerprint(source),
            reading: readingForReview(source.slug, transform),
            rationale:
              source.whyThisClause.kind === 'discretionary'
                ? 'Commercial drafting — no statute requires this provision.'
                : `${source.whyThisClause.kind === 'compelled' ? 'Required wording' : 'Implements a legal duty; wording is authored'}: ${source.whyThisClause.citation}`,
            variation:
              source.variance.kind === 'fixed'
                ? source.variance.note
                : `Alternative selected by the ${source.variance.fact} interview answer.`,
            states: source.appliesInStates,
            fields: (readable.fields ?? []).map((field) => ({
              label: field.label,
              binding: field.binding,
              kind: field.kind,
              required: field.required,
              condition: field.requiredWhen ? `${field.requiredWhen.binding} = ${field.requiredWhen.equals}` : null,
            })),
            repeatFor: readable.repeatFor ?? null,
          };
        }),
      })),
    })),
    contexts: readingContextsForReview([...MCA_INSTRUMENTS], transform),
    requirements: reviewRequirements(),
  });
};

export const changedReviewDocuments = (snapshot: McaReviewPackage): string[] =>
  snapshot.documents
    .filter(
      (document) =>
        document.sections.some((section) =>
          section.items.some((item) => {
            const current = ALL_MCA_CONTENT.find((candidate) => candidate.slug === item.slug);
            return (
              !current ||
              mcaClauseFingerprint(snapshot.kind === 'provider' ? { ...current, includeWhen: null } : current) !==
                item.sourceFingerprint
            );
          }),
        ) ||
        (snapshot.kind === 'library' &&
          contentFor(document.id as (typeof MCA_INSTRUMENTS)[number]).length !==
            document.sections.flatMap((section) => section.items).length),
    )
    .map((document) => document.id);
