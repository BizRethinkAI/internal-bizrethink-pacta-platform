import type { ClauseSource } from '../../provenance/types';
import type { ClauseStatus } from '../../server-only/feature-access';
import type { McaJurisdiction } from '../jurisdictions';
import type { ClauseExamination } from './examination';
import type { McaFacts } from './facts';
import type { McaInstrument } from './instruments';

/** Legal purpose of the current wording, not an approval or a finding (ADR 0014). */
export type WhyThisClause =
  | { kind: 'compelled'; citation: string; appliesWhen: string }
  | { kind: 'implements'; citation: string }
  | { kind: 'discretionary' };

export type FixedBecause = 'compelled' | 'misattributed' | 'no-alternative' | 'unwritable' | 'load-bearing';

/**
 * A complete alternative group earns `offered`. A conditional inclusion alone
 * does not: fixed wording can still be inapplicable to a particular template.
 * This records available wording, not a prohibition on future commercial terms.
 */
export type ClauseVariance =
  | { kind: 'offered'; fact: keyof McaFacts }
  | { kind: 'fixed'; because: FixedBecause; note: string };

export type { ClauseExamination } from './examination';

/** Operative provisions are the only entries in the clause catalogue. */
export type McaClauseKind = 'clause';

/**
 * A current document field. Semantic bindings do not inherit the original
 * document's labels or private-identifier slots. `legacyWidget` preserves the
 * source anchor for coverage; it must never be used as an active fill key.
 */
export type ClauseField = {
  /** Current document label; historical source labels are not the fill contract. */
  label: string;
  /** Semantic value key, resolved in this instrument's transaction/signer context. */
  binding: string;
  /** Current stable placeholder, independent of the source form's numbered widget. */
  widget: string;
  /** Original source anchor, retained only for provenance and coverage. */
  legacyWidget?: string;
  kind: 'text' | 'date' | 'signature' | 'ssn' | 'currency';
  required: boolean;
  requiredWhen?: { binding: 'guarantor.kind'; equals: 'entity' };
};

/** Shared evidence and ordering; catalogue membership is separately typed. */
export type McaContentBase = {
  slug: string;
  version: number;
  instrument: McaInstrument;
  includeWhen: ((facts: McaFacts) => boolean) | null;
  referenceId?: string;
  section: string;
  sortKey: number;
  heading: string;
  body: string;
  source: ClauseSource;
  status: ClauseStatus;
  appliesInStates: McaJurisdiction[];
  whyThisClause: WhyThisClause;
  variance: ClauseVariance;
  examinedBy: ClauseExamination[];
  /** Original identities whose text/fields this entry extracts; not an approval. */
  derivedFrom?: string[];
};

export type McaClause = McaContentBase & {
  kind: 'clause';
  fields?: never;
  repeatFor?: never;
  retiredFields?: never;
  unnumberedReason?: never;
  uses?: never;
  placement?: never;
};

export type McaContentUse = 'document' | 'interview' | 'template';
export type McaContentPlacement = { before: string } | { after: string } | { section: string; edge: 'start' | 'end' };

/** Required document wording remains reviewable even without a clause number. */
export type McaReusableContent = McaContentBase & {
  kind: 'field-group' | 'document-block' | 'guidance';
  uses: McaContentUse[];
  placement: McaContentPlacement | null;
  fields?: ClauseField[];
  repeatFor?: 'guarantor';
  retiredFields?: { widget: string; reason: string }[];
  unnumberedReason?: never;
};

/** Shared services accept both; clause catalogue entry points accept McaClause only. */
export type McaContent = McaClause | McaReusableContent;
