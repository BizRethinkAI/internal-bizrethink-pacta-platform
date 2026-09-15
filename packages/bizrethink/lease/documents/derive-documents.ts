/**
 * Documents a human uploaded, as opposed to documents this system generated.
 *
 * Everything else in the lease package is assembled from clauses. These are
 * not: a recorded declaration and a photographic condition report exist before
 * the lease does, and no amount of drafting produces them.
 *
 * WHY THEY ARE ACKNOWLEDGED RATHER THAN BOUND IN. `EnvelopeAttachment` upstream
 * is `z.enum(['link'])` — it carries a URL, never bytes — so anything placed
 * inside the signing package has to be an `EnvelopeItem`, which is a document
 * the signer scrolls through. Estancia's declaration and its amendments run to
 * a few hundred pages, and the move-in inspection for this one house is 418.
 * Putting those in front of a signer buries the lease.
 *
 * So the envelope gets one generated page naming each document, and the
 * documents themselves are read alongside it. That page is the point, not a
 * consolation: the lease binds the tenant to the governing documents, and a
 * tenant who was never given them has the obvious answer. A signed receipt
 * naming each instrument closes that.
 *
 * WHY THE REFERENCE IS PRINTED VERBATIM. A signer who wants to check what they
 * agreed to should be able to take the line off the page to the county
 * recorder and pull the same instrument. That only works if the recording
 * reference survives unedited, so it is stored and printed as typed.
 */

import { formatLongDate } from '../render/long-date';
import { pageLabel } from './count-pages';
import { governingBundleUrl, governingDocumentUrl } from './document-urls';
import type { GoverningNames } from './governing-structure';
import { structureGoverningDocuments } from './governing-structure';

export type DocumentKind = 'hoa-governing' | 'move-in-report' | 'move-out-report';

export type LeaseDocument = {
  id: string;
  kind: DocumentKind;
  /** "Ninth Amendment to the Declaration". How a human refers to it. */
  label: string;
  /** As recorded: "Instr# 2021271188, OR 10509/675". Printed verbatim, or ''. */
  reference: string;
  /** ISO date, or '' when the document does not carry one. */
  documentDate: string;
  /** Null when not yet counted. */
  pageCount: number | null;
  /** Who issued a governing document; its receipt heading. Null until the landlord says. */
  issuer?: GoverningIssuer | null;
  /** What it covers, in a few words: "leasing rules and tenant registration". */
  description?: string | null;
  /** The document this one amends or supplements; it is listed beneath it. */
  amendsDocumentId?: string | null;
};

export type GoverningIssuer = 'association' | 'cdd' | 'other';

export const hasGoverningDocuments = (documents: LeaseDocument[]): boolean =>
  documents.some((document) => document.kind === 'hoa-governing');

/**
 * The documents, numbered, for interpolation into an acknowledgement clause.
 *
 * Numbered rather than run together in prose — unlike the yard duties, which
 * read as a sentence — because a receipt is referred to item by item when it is
 * ever argued about.
 */
/**
 * A numbered list of uploaded documents, one per line — for the condition
 * report acknowledgement. Governing documents have their own grouped form,
 * `describeGoverningDocuments`, because a receipt of sixteen instruments needs
 * structure a one-page inspection report does not.
 */
export const describeDocuments = (documents: LeaseDocument[], kind: DocumentKind = 'hoa-governing'): string =>
  documents
    .filter((document) => document.kind === kind)
    .map((document, at) => {
      const date = formatLongDate(document.documentDate);

      /*
        The bracket holds what identifies the physical document — where to find
        it, and how much of it there is — while the date reads as part of the
        name. One bracket either way, never two.
      */
      const inBrackets = [
        document.reference.trim(),
        document.pageCount === null ? '' : pageLabel(document.pageCount),
      ].filter((part) => part !== '');

      const named = date === '' ? document.label.trim() : `${document.label.trim()}, dated ${date}`;

      return inBrackets.length === 0 ? `${at + 1}. ${named}` : `${at + 1}. ${named} (${inBrackets.join(', ')})`;
    })
    .join('\n');

export type GoverningListOptions = {
  /** Heading names from the property record. */
  names: GoverningNames;
  /** The lease the download links are issued under. Without it the list carries no links. */
  matterId?: string;
};

/**
 * The receipt's list of governing documents, as line markup `clauseBody` renders:
 *
 *   [[group Estancia at Wiregrass Master Property Owners Association]]
 *   [[doc]]1. Amended and Restated Master Declaration — community rules (July 20, 2015) · [[link download|…]]
 *   [[ref]]Instr# 2015115091, OR 9227/2447 · 155 pages
 *   [[doc sub]]1a. Ninth Amendment — leasing rules (December 16, 2021) · [[link download|…]]
 *   [[ref sub]]Instr# 2021271188, OR 10509/675 · 5 pages
 *
 * WHAT IT COVERS LEADS; THE RECORDING REFERENCE FOLLOWS, QUIETER. The pilot
 * printed "Second Amendment to the Amended and Restated Master Declaration, dated
 * November 3, 2015 (Instr# 2015176914, OR 9279/3728, 5 pages)" and nobody could
 * tell what it was for. The reference is not dropped — it is what lets a tenant
 * pull the same instrument from the county recorder, which is the receipt's
 * legal point — it is set beneath, where it identifies without crowding.
 *
 * Links only for governing documents, which are public records; a single
 * download for all of them ends the list, its URL on a line of its own so a
 * printed copy carries an address someone can type.
 */
export const describeGoverningDocuments = (
  documents: LeaseDocument[],
  { names, matterId }: GoverningListOptions,
): string => {
  const groups = structureGoverningDocuments(documents, names);
  const count = groups.reduce((total, group) => total + group.entries.length, 0);

  const lines = groups.flatMap((group) => [
    `[[group ${group.heading}]]`,
    ...group.entries.flatMap(({ document, number, depth }) => {
      const sub = depth === 1 ? ' sub' : '';
      const description = (document.description ?? '').trim();
      const date = formatLongDate(document.documentDate);

      const main = [
        `${number}. ${document.label.trim()}`,
        description === '' ? '' : ` — ${description}`,
        date === '' ? '' : ` (${date})`,
        matterId ? ` · [[link download|${governingDocumentUrl(matterId, document.id)}]]` : '',
      ].join('');

      const reference = [document.reference.trim(), document.pageCount === null ? '' : pageLabel(document.pageCount)]
        .filter((part) => part !== '')
        .join(' · ');

      return [`[[doc${sub}]]${main}`, ...(reference === '' ? [] : [`[[ref${sub}]]${reference}`])];
    }),
  ]);

  if (!matterId || count < 2) {
    return lines.join('\n');
  }

  const all = governingBundleUrl(matterId);

  return [...lines, `All ${count} documents in one download:`, `[[link ${all}|${all}]]`].join('\n');
};
