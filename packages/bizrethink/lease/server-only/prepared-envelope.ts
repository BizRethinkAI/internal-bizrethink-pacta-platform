import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';
import { DocumentStatus } from '@prisma/client';

import type { CreateEnvelopeFromMatterOptions } from './create-envelope-from-matter';
import { createEnvelopeFromMatter } from './create-envelope-from-matter';

/**
 * Prepare, review, send.
 *
 * The lease builder PREPARES an envelope — rendered, tokens painted out, fields
 * placed, recipients set — and stops. The landlord opens it, checks every
 * document, and sends it from the envelope with upstream's own send. Nothing in
 * this file, or anything it calls, emails a signer; a test holds that.
 *
 * The repository owner chose this on 2026-09-14, after the pilot lease was
 * marked sent while its envelope sat in DRAFT with raw signing tokens on every
 * signature line. A lease is the kind of document you look at before strangers
 * sign it.
 */

export type PrepareEnvelopeFromMatterOptions = CreateEnvelopeFromMatterOptions & {
  /**
   * Recorded with the envelope because statutes move: a lease signed today must
   * still be explainable against the rules that produced it in five years.
   */
  rulePackVersion: number;
};

export const prepareEnvelopeFromMatter = async (options: PrepareEnvelopeFromMatterOptions) => {
  const envelope = await createEnvelopeFromMatter(options);

  /*
    Recorded only while the lease is still an unprepared draft, as a condition
    of the write. Two clicks on a slow connection both get this far; exactly one
    is recorded.
  */
  const recorded = await prisma.bizrethinkLeaseMatter.updateMany({
    where: { id: options.matterId, status: 'draft', envelopeId: null },
    data: {
      status: 'ready',
      envelopeId: envelope.id,
      rulePackVersion: options.rulePackVersion,
      generatedAt: new Date(),
    },
  });

  if (recorded.count === 0) {
    // The losing envelope is unreachable from the lease. It is a draft nobody
    // has seen, so it goes rather than cluttering the documents list.
    await prisma.envelope.deleteMany({ where: { id: envelope.id, status: DocumentStatus.DRAFT } });

    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'This lease already has an envelope. Reload the page to see it.',
    });
  }

  return { envelopeId: envelope.id };
};

export type DiscardPreparedEnvelopeOptions = {
  matterId: string;
  envelopeId: string;
  teamId: number;
};

/**
 * Throw away a prepared envelope nobody has received, and reopen the lease.
 *
 * The way back when review finds something wrong: the answers are locked while
 * an envelope exists, because a PDF that drifts from its answers has nothing to
 * reconcile the two.
 *
 * Also the way back when the envelope was deleted from the documents list — the
 * lease still points at it, and would otherwise stay locked for ever.
 */
export const discardPreparedEnvelope = async ({ matterId, envelopeId, teamId }: DiscardPreparedEnvelopeOptions) => {
  await prisma.$transaction(async (tx) => {
    /*
      THE STATUS IS A CONDITION OF THE DELETE, not a read before it. The
      landlord may be pressing Send on the envelope in another tab; a check
      followed by a delete could erase a lease that is already in inboxes.
    */
    const deleted = await tx.envelope.deleteMany({
      where: { id: envelopeId, teamId, status: DocumentStatus.DRAFT },
    });

    if (deleted.count === 0) {
      const remaining = await tx.envelope.findFirst({ where: { id: envelopeId }, select: { status: true } });

      if (remaining) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, {
          message:
            remaining.status === DocumentStatus.DRAFT
              ? 'This envelope cannot be discarded from here.'
              : 'This envelope has already been sent, so it cannot be discarded. Cancel it from the documents list instead.',
        });
      }
    }

    const reopened = await tx.bizrethinkLeaseMatter.updateMany({
      where: { id: matterId, envelopeId },
      data: { status: 'draft', envelopeId: null, rulePackVersion: null, generatedAt: null },
    });

    // Thrown inside the transaction, so the delete above rolls back with it.
    if (reopened.count === 0) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, {
        message: 'This lease changed while its envelope was being discarded. Reload the page and try again.',
      });
    }
  });
};
