import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { CreateEnvelopeOptions } from '@documenso/lib/server-only/envelope/create-envelope';
import { createEnvelope } from '@documenso/lib/server-only/envelope/create-envelope';
import type { PlaceholderInfo } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import type { ApiRequestMetadata } from '@documenso/lib/universal/extract-request-metadata';
import { putPdfFileServerSide } from '@documenso/lib/universal/upload/put-file.server';
import { EnvelopeType, RecipientRole } from '@prisma/client';

import { canAccessLeaseBuilder, canRenderClause, canRenderDraftClauses } from '../../server-only/feature-access';
import { FL_LIBRARY } from '../clauses/us-fl';
import { selectClauses } from '../engine/select-clauses';
import type { RenderedDocument, RenderLeaseInput } from '../render/render-lease';
import { renderLease } from '../render/render-lease';
import type { LeaseParty } from '../render/signature-blocks';

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

  const selection = selectClauses({ facts: input.facts, library: FL_LIBRARY });

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

  const unpublishable = [...selection.selected, ...selection.addenda, ...selection.standaloneDisclosures]
    .filter((clause) => !canRenderClause({ status: clause.status, draftRenderingAllowed }))
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

  return await createEnvelope({ ...envelopeInput, requestMetadata });
};
