import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { deleteDocument } from '@documenso/lib/server-only/document/delete-document';
import { getEnvelopeWhereInput } from '@documenso/lib/server-only/envelope/get-envelope-by-id';
import { deleteTemplate } from '@documenso/lib/server-only/template/delete-template';
import type { ApiRequestMetadata } from '@documenso/lib/universal/extract-request-metadata';
import { prisma } from '@documenso/prisma';
import { EnvelopeType, Prisma } from '@prisma/client';

import { getApiTokenEnvelopeScope } from './api-token-team-scope';

type Options = {
  envelopeId: string;
  user: { id: number; email: string };
  teamId: number;
  requestMetadata: ApiRequestMetadata;
};
const unavailable = () => new AppError(AppErrorCode.NOT_FOUND, { message: 'Envelope not found' });

/** Authorize the dispatch lookup too: only DOCUMENT recipients get self-hide;
 * the API credential's team remains outside that exception. */
export const deleteVisibleEnvelope = async ({ envelopeId, user, teamId, requestMetadata }: Options) => {
  try {
    const access: Prisma.EnvelopeWhereInput[] = [
      { type: EnvelopeType.DOCUMENT, recipients: { some: { email: user.email } } },
    ];
    try {
      const { envelopeWhereInput } = await getEnvelopeWhereInput({
        id: { type: 'envelopeId', id: envelopeId },
        userId: user.id,
        teamId,
        type: null,
      });
      access.push(envelopeWhereInput);
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== AppErrorCode.NOT_FOUND) {
        throw error;
      }
    }
    const envelope = await prisma.envelope.findFirst({
      where: { id: envelopeId, ...getApiTokenEnvelopeScope(teamId), OR: access },
      select: { type: true },
    });
    if (!envelope) {
      throw unavailable();
    }
    const options = { id: { type: 'envelopeId' as const, id: envelopeId }, userId: user.id, teamId };
    if (envelope.type === EnvelopeType.DOCUMENT) {
      await deleteDocument({ ...options, requestMetadata });
    } else {
      await deleteTemplate(options);
    }
  } catch (error) {
    // Keep DB/service failures distinct; only absence/access failures normalize.
    if (
      (error instanceof AppError &&
        (error.code === AppErrorCode.NOT_FOUND || error.code === AppErrorCode.UNAUTHORIZED)) ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
    ) {
      throw unavailable();
    }
    throw error;
  }
};
