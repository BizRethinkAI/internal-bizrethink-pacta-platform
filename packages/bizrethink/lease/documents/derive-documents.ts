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
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/*
  Formatted here rather than with toLocaleDateString: the renderer runs on the
  server, where the locale is the container's rather than the reader's, and a
  Florida lease reading "18/04/2023" to one signer and "4/18/2023" to another
  is the kind of divergence the shared render mapping exists to prevent.
*/
const longDate = (iso: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());

  if (!match) {
    return '';
  }

  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];

  return name ? `${Number(day)} ${name} ${year}` : '';
};

export const hasGoverningDocuments = (documents: LeaseDocument[]): boolean =>
  documents.some((document) => document.kind === 'hoa-governing');

/**
 * The documents, numbered, for interpolation into an acknowledgement clause.
 *
 * Numbered rather than run together in prose — unlike the yard duties, which
 * read as a sentence — because a receipt is referred to item by item when it is
 * ever argued about.
 */
export const describeDocuments = (documents: LeaseDocument[], kind: DocumentKind = 'hoa-governing'): string =>
  documents
    .filter((document) => document.kind === kind)
    .map((document, at) => {
      const date = longDate(document.documentDate);

      /*
        The bracket holds what identifies the physical document — where to find
        it, and how much of it there is — while the date reads as part of the
        name. One bracket either way, never two.
      */
      const inBrackets = [
        document.reference.trim(),
        document.pageCount === null ? '' : `${document.pageCount} page${document.pageCount === 1 ? '' : 's'}`,
      ].filter((part) => part !== '');

      const named = date === '' ? document.label.trim() : `${document.label.trim()}, dated ${date}`;

      return inBrackets.length === 0 ? `${at + 1}. ${named}` : `${at + 1}. ${named} (${inBrackets.join(', ')})`;
    })
    .join('\n');
