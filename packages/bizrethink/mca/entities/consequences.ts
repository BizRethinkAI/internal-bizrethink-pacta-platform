import { contentFor } from '../catalogue';
import type { McaInstrument } from '../clauses/instruments';
import { instrumentsFor, selectClauses } from '../engine/select-clauses';
import { PRODUCED_INSTRUMENTS, type ProducedInstrument } from '../publish/recipient-contract';
import { entitySelectionFacts, type McaEntityPolicy } from './entity';

/**
 * WHAT EACH ANSWER WOULD DO, computed from the same selection the compiler runs.
 *
 * The interview explains a choice by what it changes, and that explanation is
 * only worth showing if it cannot drift from the document. A sentence written
 * by hand goes stale the first time a clause's predicate moves — silently, and
 * in a legal document silently is the expensive kind. So nothing here is
 * described; it is derived.
 *
 * IT OBSERVES, IT DOES NOT RECOMMEND. The lease builder's rule, and its reason:
 * "most leases use X" is a fact, "we recommend X" is advice. For an MCA the
 * stakes are higher — guaranty scope, forum and dispute resolution are exactly
 * the terms a regulator or a plaintiff's lawyer reads first — so this returns
 * differences and leaves the choosing to the funder.
 */

export type McaAnswerConsequence = {
  /** The form path this answers, e.g. `policy.disputeResolution`. */
  field: string;
  /** The option, as a string so a boolean and an enum read the same way. */
  option: string;
  /** Clause headings this option brings in, across every document it reaches. */
  adds: string[];
  /** Clause headings it takes out. */
  removes: string[];
  /**
   * Clauses it SWAPS FOR A DIFFERENT VERSION of the same thing.
   *
   * Several answers do not add or remove a clause, they choose between drafted
   * variants of one — a funder-state forum and a merchant-state forum are both
   * "Venue and Jurisdiction". Reported apart because listing the same heading
   * as both added and removed reads as nonsense, and "replaced" is what
   * actually happens.
   */
  replaces: string[];
  /** The documents whose clauses change. */
  documents: ProducedInstrument[];
  /** Documents that would come into being — an answer can create paper, not only edit it. */
  documentsAdded: McaInstrument[];
  /** Documents that would cease to exist. */
  documentsRemoved: McaInstrument[];
};

/**
 * The answers this release actually offers a choice about.
 *
 * `collectionMethod` and `settlementBase` are absent on purpose: both are
 * `z.literal()` in the schema, so this release supports exactly one value each.
 * Offering them would invite an answer the schema refuses.
 */
const CHOICES: { field: string; options: string[] }[] = [
  { field: 'policy.venueRule', options: ['merchant-state', 'funder-state'] },
  { field: 'policy.disputeResolution', options: ['courts', 'arbitration'] },
  { field: 'policy.guarantyScope', options: ['none', 'limited-conduct', 'full-performance'] },
  { field: 'policy.renewalModel', options: ['none', 'payoff-only', 'carry'] },
  { field: 'policy.equipment', options: ['none', 'merchant-elects'] },
  { field: 'policy.concurrentPositions', options: ['false', 'true'] },
  { field: 'policy.brokerChannel', options: ['false', 'true'] },
  { field: 'policy.consumerReportPulled', options: ['false', 'true'] },
];

/**
 * TAKES THE POLICY, NOT THE WHOLE ENTITY, because nothing here reads an
 * identity. Saying so in the signature keeps the interview's query cheap — it
 * refetches when an answer changes, not when someone types an address — and
 * keeps a reader from wondering whether a legal name can change a clause.
 */
const withAnswer = (policy: McaEntityPolicy, field: string, option: string): McaEntityPolicy => {
  const key = field.replace('policy.', '');
  const value = option === 'true' ? true : option === 'false' ? false : option;

  return { ...policy, [key]: value };
};

/** Every document this entity is entitled to and the builder produces. */
const producedFor = (policy: McaEntityPolicy): ProducedInstrument[] =>
  instrumentsFor(entitySelectionFacts({ policy })).filter((instrument): instrument is ProducedInstrument =>
    (PRODUCED_INSTRUMENTS as readonly string[]).includes(instrument),
  );

/** Clause slugs a document contains under these answers. */
const slugsIn = (policy: McaEntityPolicy, instrument: ProducedInstrument): Set<string> =>
  new Set(
    selectClauses({ facts: entitySelectionFacts({ policy }), instrument }).selected.map((selected) => selected.slug),
  );

/**
 * A heading a reader would recognise.
 *
 * Slugs are how the library addresses a clause; `frpa.sales-of-receipts-not-a-
 * loan-2-1` is not a sentence anyone reads. Falls back to the slug only if the
 * catalogue has no heading, which would itself be worth seeing.
 */
const headingFor = (instrument: ProducedInstrument, slug: string): string =>
  contentFor(instrument).find((entry) => entry.slug === slug)?.heading ?? slug;

export const answerConsequences = (policy: McaEntityPolicy): McaAnswerConsequence[] => {
  const now = producedFor(policy);
  const slugsNow = new Map(now.map((instrument) => [instrument, slugsIn(policy, instrument)]));

  return CHOICES.flatMap(({ field, options }) =>
    options.map((option) => {
      const changed = withAnswer(policy, field, option);
      const then = producedFor(changed);

      const addedHeadings: string[] = [];
      const removedHeadings: string[] = [];
      const documents: ProducedInstrument[] = [];

      // Only documents that exist BOTH WAYS have clauses to compare. One that
      // appears or disappears is reported as a document change instead, because
      // "adds 34 clauses" is a worse description of it than "adds a document".
      for (const instrument of then.filter((candidate) => now.includes(candidate))) {
        const before = slugsNow.get(instrument) ?? new Set<string>();
        const after = slugsIn(changed, instrument);
        const added = [...after].filter((slug) => !before.has(slug));
        const removed = [...before].filter((slug) => !after.has(slug));

        if (added.length === 0 && removed.length === 0) {
          continue;
        }

        documents.push(instrument);
        addedHeadings.push(...added.map((slug) => headingFor(instrument, slug)));
        removedHeadings.push(...removed.map((slug) => headingFor(instrument, slug)));
      }

      // A heading on both sides is one clause swapped for another drafting of
      // itself, not two separate changes.
      const replaced = new Set(addedHeadings.filter((heading) => removedHeadings.includes(heading)));
      const adds = addedHeadings.filter((heading) => !replaced.has(heading));
      const removes = removedHeadings.filter((heading) => !replaced.has(heading));

      return {
        field,
        option,
        adds,
        removes,
        replaces: [...replaced],
        documents,
        documentsAdded: then.filter((instrument) => !now.includes(instrument)),
        documentsRemoved: now.filter((instrument) => !then.includes(instrument)),
      };
    }),
  );
};

/**
 * What these answers entitle this entity to have templates for.
 *
 * The payoff at the end of the interview, and derived from the same
 * `instrumentsFor` the compiler uses — so the list cannot promise a document
 * `compileMcaTemplate` would refuse. A split funding letter never appears: ADR
 * 0019 keeps it the processor's and ADR 0026 §6 keeps it out of templates.
 */
export const documentsThisEntityCanHave = (policy: McaEntityPolicy): ProducedInstrument[] => producedFor(policy);
