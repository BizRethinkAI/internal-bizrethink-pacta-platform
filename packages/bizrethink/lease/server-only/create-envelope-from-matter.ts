import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { CreateEnvelopeOptions } from '@documenso/lib/server-only/envelope/create-envelope';
import { createEnvelope } from '@documenso/lib/server-only/envelope/create-envelope';
import type { PlaceholderInfo } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';

import { attachmentLinks } from '../documents/attachment-links';
import type { ApiRequestMetadata } from '@documenso/lib/universal/extract-request-metadata';
import { putPdfFileServerSide } from '@documenso/lib/universal/upload/put-file.server';
import { prisma } from '@documenso/prisma';
import { EnvelopeType, RecipientRole } from '@prisma/client';

import { canAccessLeaseBuilder, canRenderClause, canRenderDraftClauses } from '../../server-only/feature-access';
import { DEFAULT_LEASE_JURISDICTION } from '../clauses/approval-jurisdiction';
import { libraryFor } from '../clauses/library';
import { selectClauses } from '../engine/select-clauses';
import type { RenderedDocument, RenderLeaseInput } from '../render/render-lease';
import { renderLease } from '../render/render-lease';
import type { LeaseParty } from '../render/signature-blocks';
import { loadClauseApprovals, statusWithApproval } from './clause-approvals';

/**
 * Hand the rendered lease to upstream's signing platform.
 *
 * THE ORDERING IS THE MAPPING. Upstream resolves a placeholder to a recipient
 * by index — `findRecipientByPlaceholder` turns `r1` into `recipients[0]`,
 * `r2` into `recipients[1]`, and so on. Our signature blocks assign `r1..rN`
 * across the party list in order. Those two orderings are the same fact stated
 * in two places, and if they ever diverge the envelope still creates cleanly
 * and every field simply attaches to the wrong person: a countersigned lease
 * with the landlord's signature sitting in the tenant's block, and no error
 * anywhere. Hence `buildEnvelopeInput` derives recipients from the same array
 * the placeholders were numbered from, and a test asserts it.
 *
 * Split in two on purpose: `buildEnvelopeInput` is pure and fully tested,
 * `createEnvelopeFromMatter` is the thin shell that touches storage and the
 * database.
 */

export type BuildEnvelopeInputOptions = {
  rendered: RenderedDocument[];
  /** Placeholders extracted from each rendered PDF, keyed by document key. */
  placeholdersByKey: Record<string, PlaceholderInfo[]>;
  /** `documentData.id` returned by the upload, keyed by document key. */
  documentDataIds: Record<string, string>;
  parties: LeaseParty[];
  /** Party name to email. Every party must have one. */
  emails: Record<string, string>;
  userId: number;
  teamId: number;
  title: string;
  /** From `renderLease`. False while any declared variable is unfilled. */
  readyToSend: boolean;
};

export const buildEnvelopeInput = ({
  rendered,
  placeholdersByKey,
  documentDataIds,
  parties,
  emails,
  userId,
  teamId,
  title,
  readyToSend,
}: BuildEnvelopeInputOptions): Omit<CreateEnvelopeOptions, 'requestMetadata'> => {
  if (!readyToSend) {
    throw new Error(
      'Lease is not ready to send: one or more clause variables are still unfilled. Sending now would put a raw {{token}} in front of a signer.',
    );
  }

  const missingEmails = parties.filter((party) => !emails[party.name]).map((party) => party.name);

  if (missingEmails.length > 0) {
    throw new Error(`No email address for: ${missingEmails.join(', ')}`);
  }

  /*
    Derived from the same array the placeholders were numbered across, so the
    index mapping cannot drift. Do not sort, filter or regroup this.
  */
  const recipients = parties.map((party, index) => ({
    email: emails[party.name],
    name: party.name,
    role: RecipientRole.SIGNER,
    // Everyone signs in parallel; a lease has no required signing order.
    signingOrder: index + 1,
  }));

  const envelopeItems = rendered.map((doc, order) => {
    const documentDataId = documentDataIds[doc.key];

    if (!documentDataId) {
      throw new Error(`No uploaded document data for ${doc.key}`);
    }

    return {
      title: doc.title,
      documentDataId,
      order,
      // Upstream converts these into fields at their extracted coordinates and
      // whites the tokens out of the PDF.
      placeholders: placeholdersByKey[doc.key] ?? [],
    };
  });

  return {
    userId,
    teamId,
    // The generated PDF is already well-formed; normalisation is for uploads of
    // unknown provenance.
    normalizePdf: false,
    internalVersion: 2,
    data: {
      type: EnvelopeType.DOCUMENT,
      title,
      envelopeItems,
      recipients,
    },
    // Recipients are explicit and complete; upstream must not add the owner as
    // a default signer on top of them, which would shift no indices but would
    // add a signature nobody asked for.
    bypassDefaultRecipients: true,
  };
};

export type CreateEnvelopeFromMatterOptions = {
  input: RenderLeaseInput;
  /**
   * The matter the envelope is being created FROM, and its governing
   * documents.
   *
   * Both are here only to build the signer-facing attachment links. The matter
   * id keys the URL because `EnvelopeAttachment` carries one `data` string for
   * every recipient — so no per-signer token can go in it — and because
   * `createEnvelope` makes the envelope and its attachments in one call, so
   * there is no envelope id yet.
   */
  matterId: string;
  parties: LeaseParty[];
  emails: Record<string, string>;
  userId: number;
  teamId: number;
  organisationId: string;
  title: string;
  requestMetadata: ApiRequestMetadata;
};

/**
 * The full path: gate, render, upload, extract, create.
 *
 * Both locks from `feature-access.ts` are enforced here rather than at the
 * route, because this is the narrowest point every caller must pass through.
 *
 * Thin by design — everything worth testing lives in `buildEnvelopeInput`,
 * `renderLease` and `selectClauses`, all of which are pure. This function is
 * the part that talks to storage and the database.
 */
export const createEnvelopeFromMatter = async ({
  input,
  matterId,
  parties,
  emails,
  userId,
  teamId,
  organisationId,
  title,
  requestMetadata,
}: CreateEnvelopeFromMatterOptions) => {
  // Lock 1: is the lease builder switched on for this org or this user at all?
  const allowed = await canAccessLeaseBuilder({ organisationId, userId });

  if (!allowed) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, {
      message: 'The lease builder is not enabled for this organisation.',
    });
  }

  /*
    THE SAME LIBRARY THE RENDERER IS ABOUT TO USE. This selected from the Florida
    module's whole export while `buildLeaseDocuments`, inside the `renderLease`
    below, selected from `libraryFor(input.jurisdiction)`. Identical outputs
    while Florida was the only state with clauses of its own; the moment a second
    one has any, the attorney-review gate below is checking a different set of
    clauses from the ones that reach the signer.
  */
  const selection = selectClauses({
    facts: input.facts,
    library: libraryFor(input.jurisdiction ?? DEFAULT_LEASE_JURISDICTION),
  });

  /*
    Lock 2: no unreviewed clause text may reach a third party. Checked against
    the clauses actually selected, so an org becomes able to send exactly when
    every clause its answers select has been through review — not when the
    library as a whole has.

    Resolved here from its own grant rather than accepted as a parameter. A
    caller-supplied "this org is allowed" boolean is a lock whose key is held
    by the caller; the whole point of lock 2 is to hold when lock 1 has been
    got wrong.
  */
  const draftRenderingAllowed = await canRenderDraftClauses({ organisationId, userId });

  /*
    Attorney sign-off is read here, not baked into the clause. The library is
    TypeScript so an approval cannot live in it; it lives in the database and
    is pinned to a fingerprint of the clause as approved, so a later edit
    lapses it rather than silently inheriting review of words nobody read.
  */
  const approvals = await loadClauseApprovals();

  const unpublishable = [...selection.selected, ...selection.addenda, ...selection.standaloneDisclosures]
    .filter((clause) => !canRenderClause({ status: statusWithApproval(clause, approvals), draftRenderingAllowed }))
    .map((clause) => clause.slug);

  if (unpublishable.length > 0) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, {
      message: `These clauses have not been through attorney review and cannot be sent to a third party: ${unpublishable.join(', ')}`,
    });
  }

  const rendered = await renderLease(input);

  // Upload each document separately — they are separate instruments, and the
  // flood disclosure is required to be one.
  const documentDataIds: Record<string, string> = {};
  const placeholdersByKey: Record<string, PlaceholderInfo[]> = {};

  for (const doc of rendered.rendered) {
    const file = new File([new Uint8Array(doc.pdf)], `${doc.title}.pdf`, { type: 'application/pdf' });
    const { documentData } = await putPdfFileServerSide(file);

    documentDataIds[doc.key] = documentData.id;
    placeholdersByKey[doc.key] = await extractPlaceholdersFromPDF(doc.pdf);
  }

  const envelopeInput = buildEnvelopeInput({
    rendered: rendered.rendered,
    placeholdersByKey,
    documentDataIds,
    parties,
    emails,
    userId,
    teamId,
    title,
    readyToSend: rendered.readyToSend,
  });

  /*
    The governing documents ride along as LINKS, which is what the receipt
    addendum needs to be true rather than merely asserted: the signing view
    renders them beside the lease, so a tenant acknowledging receipt of sixteen
    instruments can open each one.

    Read here rather than passed in, and ordered exactly as the receipt recites
    them, so the popover and the addendum cannot drift apart.
  */
  const matter = await prisma.bizrethinkLeaseMatter.findUnique({
    where: { id: matterId },
    select: { propertyId: true },
  });

  const governingDocuments = await prisma.bizrethinkDocument.findMany({
    where: {
      kind: 'hoa-governing',
      archivedAt: null,
      OR: [{ propertyId: matter?.propertyId ?? '' }, { matterId }],
    },
    select: { id: true, kind: true, label: true, reference: true, documentDate: true, pageCount: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return await createEnvelope({
    ...envelopeInput,
    attachments: attachmentLinks(
      matterId,
      governingDocuments.map((document) => ({
        id: document.id,
        kind: 'hoa-governing' as const,
        label: document.label,
        reference: document.reference ?? '',
        documentDate: document.documentDate?.toISOString() ?? '',
        pageCount: document.pageCount,
      })),
    ),
    requestMetadata,
  });
};
