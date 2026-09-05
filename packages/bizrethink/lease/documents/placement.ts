import type { DocumentKind } from './derive-documents';

/**
 * Which owner each kind of document may hang from.
 *
 * The two kinds pull in opposite directions, and getting it wrong is silent
 * rather than loud — the row saves, the lease renders, and the mistake shows up
 * in what a tenant is asked to acknowledge.
 *
 * A recorded declaration belongs to the PROPERTY. It outlives every tenancy on
 * it, and holding it there is what lets next year's lease receipt the same
 * instruments without anyone re-uploading a few hundred pages.
 *
 * A condition report belongs to the MATTER. It records one tenancy at one
 * moment. Hung on the property it would be receipted into every later lease as
 * though the incoming tenant had agreed the outgoing tenant's scuffs — and
 * since a deposit deduction rests on that record, it is the one document where
 * attaching it to the wrong tenancy has money on the other end.
 */
const OWNER: Record<DocumentKind, 'property' | 'matter'> = {
  'hoa-governing': 'property',
  'move-in-report': 'matter',
  'move-out-report': 'matter',
};

/**
 * The ceiling on an uploaded document, in megabytes.
 *
 * Deliberately above upstream's `APP_DOCUMENT_UPLOAD_SIZE_LIMIT` of 50. That
 * limit guards files pushed through the signing editor, where every page is
 * rendered for field placement and a huge file is a hung browser. These are
 * never placed or scrolled there — they are stored, listed, and opened on
 * their own — so the constraint that applies is what the storage backend will
 * take, not what the editor will survive.
 *
 * 50 was also simply too low to be useful: the real move-in inspection for one
 * house came to 54.7 MB of photographs, and photographs are the entire
 * evidentiary value of a condition report.
 */
export const MAX_DOCUMENT_MB = 128;

export const assertDocumentPlacement = (
  kind: DocumentKind,
  owner: { propertyId?: string | null; matterId?: string | null },
): void => {
  const expected = OWNER[kind];

  if (!expected) {
    throw new Error(`Unknown document kind "${kind}".`);
  }

  const hasProperty = Boolean(owner.propertyId);
  const hasMatter = Boolean(owner.matterId);

  if (hasProperty === hasMatter) {
    throw new Error('A document must belong to exactly one of a property or a lease.');
  }

  if (expected === 'property' && !hasProperty) {
    throw new Error(
      `A ${kind} document belongs to the property, not to one lease: it outlives the tenancy and is receipted on every lease of that property.`,
    );
  }

  if (expected === 'matter' && !hasMatter) {
    throw new Error(
      `A ${kind} document belongs to one lease, not to the property: it records a single tenancy at a single moment.`,
    );
  }
};
