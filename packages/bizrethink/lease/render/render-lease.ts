import type { CustomClauseInput } from '../clauses/custom';
import { toCustomClause } from '../clauses/custom';
import type { ClauseFacts } from '../clauses/types';
import { FL_LIBRARY } from '../clauses/us-fl';
import { selectClauses } from '../engine/select-clauses';
import { deriveMoney } from '../money/derive';
import type { MoneyAnswers } from '../money/types';
import type { InterpolationValue } from './interpolate';
import type { LeaseDocumentSpec } from './lease-document';
import { buildClauseText, renderCombinedPdf, renderDocumentPdf } from './lease-document';
import type { LeaseParty } from './signature-blocks';

/**
 * Facts and answers in, PDF out.
 *
 * The order matters: select, derive, interpolate, render. Money is derived
 * before interpolation and merged into the values, so the figures in the
 * deposit clause and the figures in the amounts-due table come from the same
 * computation and cannot disagree — the structural fix for the contradiction
 * in the 2026 lease.
 */

export type RenderLeaseInput = {
  facts: ClauseFacts;
  money: MoneyAnswers;
  values: Record<string, InterpolationValue>;
  parties: LeaseParty[];
  propertyAddress: string;
  /**
   * Clauses the landlord wrote. Appended to the library rather than handled
   * separately, so they are selected, ordered, numbered and duplicate-checked
   * by exactly the same code as everything else.
   */
  customClauses?: CustomClauseInput[];
};

export type RenderedDocument = {
  key: string;
  title: string;
  pdf: Buffer;
  spec: LeaseDocumentSpec;
};

export type RenderLeaseResult = {
  /** One PDF per document. The lease is always first. */
  rendered: RenderedDocument[];
  /** `clauseSlug: variableName` for every declared variable left unfilled. */
  missing: string[];
  /**
   * False while any declared variable is unfilled. A lease with a raw
   * `{{token}}` in it may be previewed — that is how you see what is still
   * outstanding — but it must never be sent for signature.
   */
  readyToSend: boolean;
  documents: LeaseDocumentSpec[];
};

export const buildLeaseDocuments = (input: RenderLeaseInput): { documents: LeaseDocumentSpec[]; missing: string[] } => {
  const { facts, money, values, propertyAddress, customClauses = [] } = input;

  const library = [...FL_LIBRARY, ...customClauses.map((clause, index) => toCustomClause(clause, index))];

  const selection = selectClauses({ facts, library });
  const derived = deriveMoney(money);

  /*
    Derived money joins the answer values. Anything a clause needs to say about
    an amount now reads from the same numbers as the summary table.
  */
  const allValues: Record<string, InterpolationValue> = {
    ...values,
    monthlyRentUsd: money.rent.monthlyUsd,
    depositHeldUsd: derived.depositHeldUsd,
    depositCarriedInUsd: money.deposit.alreadyHeldUsd,
    depositDueAtExecutionUsd: derived.depositDueAtExecutionUsd,
    advanceRentUsd: money.deposit.advanceRentUsd,
    advanceRentCarriedInUsd: money.deposit.advanceRentHeldUsd,
    advanceRentTrueUpUsd: derived.advanceRentTrueUpUsd,
    proratedFirstPeriodUsd: derived.proratedFirstPeriodUsd,
    proratedDays: derived.proratedDays,
    prorationMethodLabel: money.prorationMethod === 'thirty-day-month' ? 'a 30-day month' : 'the days in the month',
  };

  const missing: string[] = [];

  const body = buildClauseText({ clauses: selection.selected, values: allValues });

  missing.push(...body.missing);

  const documents: LeaseDocumentSpec[] = [
    {
      key: 'lease',
      title: 'Residential Lease',
      subtitle: propertyAddress,
      clauses: body.rendered,
      withInitials: false,
      showToc: true,
      amountsDue: { lines: derived.lines, totalUsd: derived.totalDueAtExecutionUsd },
    },
  ];

  /*
    Each addendum and each standalone disclosure is its own document with its
    own signature block. For the flood disclosure that is a statutory
    requirement rather than a presentational choice — Fla. Stat. §83.512 says it
    may not be folded into the lease.
  */
  for (const addendum of selection.addenda) {
    const rendered = buildClauseText({ clauses: [addendum], values: allValues });

    missing.push(...rendered.missing);

    documents.push({
      key: `addendum:${addendum.slug}`,
      title: addendum.heading,
      subtitle: `Attached to and forming part of the Residential Lease for ${propertyAddress}`,
      clauses: rendered.rendered,
      withInitials: true,
      showToc: false,
    });
  }

  for (const disclosure of selection.standaloneDisclosures) {
    const rendered = buildClauseText({ clauses: [disclosure], values: allValues });

    missing.push(...rendered.missing);

    documents.push({
      key: `disclosure:${disclosure.slug}`,
      title: disclosure.heading,
      subtitle: `Given in respect of ${propertyAddress}`,
      clauses: rendered.rendered,
      withInitials: false,
      showToc: false,
    });
  }

  return { documents, missing };
};

export const renderLease = async (input: RenderLeaseInput): Promise<RenderLeaseResult> => {
  const { documents, missing } = buildLeaseDocuments(input);

  const rendered = await Promise.all(
    documents.map(async (spec) => ({
      key: spec.key,
      title: spec.title,
      pdf: await renderDocumentPdf(spec, input.parties),
      spec,
    })),
  );

  return { rendered, missing, readyToSend: missing.length === 0, documents };
};

/**
 * The whole instrument set as one file, for reading.
 *
 * The landlord's preview and the reviewer's copy both picked the lease out of
 * `rendered` and returned it alone, while the envelope uploaded every document
 * `buildLeaseDocuments` produced. The attorney read one; the signers received
 * up to seven, including the two Florida requires to be separate.
 *
 * Signing is unchanged — `renderLease` still returns them separately and the
 * envelope still gets distinct items. This is only how a human reads them
 * before anyone signs anything.
 */
export const renderLeaseForReview = async (input: RenderLeaseInput): Promise<Buffer> => {
  const { documents } = buildLeaseDocuments(input);

  return await renderCombinedPdf(documents, input.parties);
};
