import type { GoverningIssuer, LeaseDocument } from './derive-documents';

/**
 * The governing documents as a reader needs them: by who issued them, each with
 * its amendments beneath it.
 *
 * The pilot receipt listed sixteen instruments in one numbered run — nine titled
 * "… Amendment to the Amended and Restated Master Declaration", and two from the
 * Community Development District printed as the association's. The repository
 * owner could not say which was for what. This is the one ordering the receipt,
 * the envelope's attachment list and the download-all zip all follow, so item
 * "1b" means the same document in all three.
 */

export type GoverningNames = {
  /** The property's association name — `hoaName`. */
  association?: string;
  /** The property's district name — `cddName`. */
  cdd?: string;
};

export type ReceiptEntry = {
  document: LeaseDocument;
  /** "3" at the top level; "3a", "3b" for what amends document 3. */
  number: string;
  depth: 0 | 1;
};

export type ReceiptGroup = {
  issuer: GoverningIssuer;
  heading: string;
  entries: ReceiptEntry[];
};

const ISSUER_ORDER: GoverningIssuer[] = ['association', 'cdd', 'other'];

const headingFor = (issuer: GoverningIssuer, names: GoverningNames): string => {
  const named = (value: string | undefined) => (value && value.trim() !== '' ? value.trim() : undefined);

  if (issuer === 'association') {
    return named(names.association) ?? 'Homeowners association';
  }

  if (issuer === 'cdd') {
    return named(names.cdd) ?? 'Community Development District';
  }

  return 'Other documents';
};

/**
 * The document an entry is listed under, or null to list it at the top level.
 *
 * Followed to the ORIGINAL: an amendment to an amendment still belongs to the
 * declaration. A parent that is missing (archived, or not a governing document),
 * the document itself, or a loop all list it at the top level rather than hiding
 * it — a document that fails to appear is worse than one in the wrong place.
 */
const rootOf = (document: LeaseDocument, byId: Map<string, LeaseDocument>): LeaseDocument | null => {
  const seen = new Set<string>([document.id]);
  let current = document;

  while (current.amendsDocumentId) {
    const parent = byId.get(current.amendsDocumentId);

    if (!parent || seen.has(parent.id)) {
      return null;
    }

    seen.add(parent.id);
    current = parent;
  }

  return current === document ? null : current;
};

const letter = (index: number) => String.fromCharCode('a'.charCodeAt(0) + index);

/** Documents arrive in upload order (`sortOrder`, then `createdAt`); that order is kept within every level. */
export const structureGoverningDocuments = (documents: LeaseDocument[], names: GoverningNames): ReceiptGroup[] => {
  const governing = documents.filter((document) => document.kind === 'hoa-governing');
  const byId = new Map(governing.map((document) => [document.id, document]));

  const roots = governing.filter((document) => rootOf(document, byId) === null);
  const childrenOf = (root: LeaseDocument) => governing.filter((document) => rootOf(document, byId)?.id === root.id);

  let next = 0;

  return ISSUER_ORDER.flatMap((issuer) => {
    const inGroup = roots.filter((root) => (root.issuer ?? 'other') === issuer);

    if (inGroup.length === 0) {
      return [];
    }

    const entries = inGroup.flatMap((root) => {
      next += 1;
      const number = String(next);

      return [
        { document: root, number, depth: 0 as const },
        ...childrenOf(root).map((child, at) => ({
          document: child,
          number: `${number}${letter(at)}`,
          depth: 1 as const,
        })),
      ];
    });

    return [{ issuer, heading: headingFor(issuer, names), entries }];
  });
};

export type GoverningDocumentGap = {
  id: string;
  label: string;
  /** In the words the Association documents step uses. */
  missing: ('who issued it' | 'what it covers')[];
};

/** Governing documents that cannot go on a receipt yet. Preparing an envelope is refused while any exist. */
export const governingDocumentGaps = (documents: LeaseDocument[]): GoverningDocumentGap[] =>
  documents
    .filter((document) => document.kind === 'hoa-governing')
    .map((document) => ({
      id: document.id,
      label: document.label,
      missing: [
        ...(document.issuer ? [] : (['who issued it'] as const)),
        ...((document.description ?? '').trim() === '' ? (['what it covers'] as const) : []),
      ],
    }))
    .filter((gap) => gap.missing.length > 0);

/**
 * Why a document may not be recorded as amending `targetId`, or null if it may.
 *
 * `siblings` are the governing documents of the same property (or lease). The
 * receipt already lists a bad link at the top level rather than hide anything;
 * this refuses to store one in the first place.
 */
export const amendsProblem = (
  documentId: string,
  targetId: string | null,
  siblings: LeaseDocument[],
): string | null => {
  if (targetId === null) {
    return null;
  }

  if (targetId === documentId) {
    return 'A document cannot amend itself.';
  }

  const byId = new Map(siblings.filter((each) => each.kind === 'hoa-governing').map((each) => [each.id, each]));

  if (!byId.has(targetId)) {
    return 'It can only amend another governing document of the same property.';
  }

  // Walk up from the target: reaching this document means the target already amends it.
  const seen = new Set<string>();
  let current = byId.get(targetId);

  while (current && !seen.has(current.id)) {
    if (current.id === documentId) {
      return 'That document already amends this one.';
    }

    seen.add(current.id);
    current = current.amendsDocumentId ? byId.get(current.amendsDocumentId) : undefined;
  }

  return null;
};
