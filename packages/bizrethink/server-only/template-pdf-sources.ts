import { createHash } from 'node:crypto';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { getEnvelopeWhereInput } from '@documenso/lib/server-only/envelope/get-envelope-by-id';
import { getOrganisationTemplateWhereInput } from '@documenso/lib/server-only/template/get-organisation-template-by-id';
import { prisma } from '@documenso/prisma';
import type { DocumentData } from '@prisma/client';

import { getApiTokenEnvelopeScope } from './api-token-team-scope';

export type PdfUploadOwner = { userId: number; teamId: number | null };

const unavailable = () => new AppError(AppErrorCode.NOT_FOUND, { message: 'Replacement PDF not found or unavailable' });
const fingerprint = (data: DocumentData) =>
  createHash('sha256')
    .update(JSON.stringify([data.type, data.data, data.initialData]))
    .digest('hex');

/** Called only with a newly created server upload, never a client-supplied ID. */
export const recordPdfUpload = async (documentData: DocumentData, owner: PdfUploadOwner) => {
  if (
    !Number.isSafeInteger(owner.userId) ||
    owner.userId <= 0 ||
    (owner.teamId !== null && (!Number.isSafeInteger(owner.teamId) || owner.teamId <= 0))
  ) {
    throw unavailable();
  }
  // Create, not upsert: knowing an existing ID can never transfer its receipt.
  await prisma.bizrethinkPdfUpload.create({
    data: {
      documentDataId: documentData.id,
      userId: owner.userId,
      teamId: owner.teamId,
      fingerprint: fingerprint(documentData),
    },
  });
};

type TemplateItem = { id: string; documentDataId: string; documentData: DocumentData };
type SourceOptions = {
  userId: number;
  teamId: number;
  /** Items loaded by the already authorized template query, not client input. */
  templateItems: TemplateItem[];
  customDocumentData: Array<{ documentDataId: string; envelopeItemId?: string }>;
};

/** Resolve every source before the caller reads bytes or creates any copies. */
export const resolveTemplatePdfSources = async ({
  userId,
  teamId,
  templateItems,
  customDocumentData,
}: SourceOptions): Promise<DocumentData[]> => {
  const apiScope = getApiTokenEnvelopeScope(teamId);
  const authorizedTemplateData = new Map(templateItems.map((item) => [item.documentDataId, item.documentData]));
  const resolved = new Map<string, Promise<DocumentData>>();
  return await Promise.all(
    templateItems.map((item) => {
      // Preserve the legacy omitted-item mapping and the modern explicit mapping.
      const replacement = customDocumentData.find(
        (entry) => (entry.documentDataId && !entry.envelopeItemId) || entry.envelopeItemId === item.id,
      );
      const id = replacement?.documentDataId ?? item.documentDataId;
      const original = authorizedTemplateData.get(id);
      if (original) {
        return original;
      }
      let source = resolved.get(id);
      if (!source) {
        source = resolveReplacement(id, userId, teamId, apiScope);
        resolved.set(id, source);
      }
      return source;
    }),
  );
};

const resolveReplacement = async (
  id: string,
  userId: number,
  teamId: number,
  apiScope: { teamId?: number },
): Promise<DocumentData> => {
  // First inspect only the binding, not the foreign file contents.
  const binding = await prisma.documentData.findUnique({
    where: { id },
    select: { envelopeItem: { select: { envelopeId: true } } },
  });
  if (!binding) {
    throw unavailable();
  }
  if (binding.envelopeItem) {
    const sourceId = { type: 'envelopeId', id: binding.envelopeItem.envelopeId } as const;
    const { envelopeWhereInput, team } = await getEnvelopeWhereInput({ id: sourceId, type: null, userId, teamId });
    // Read the bytes/reference in the same query that checks the current
    // binding and permission. Never re-fetch globally after authorization.
    const source = await prisma.documentData.findFirst({
      where: {
        id,
        envelopeItem: {
          envelope: {
            AND: [
              { deletedAt: null, ...apiScope },
              {
                OR: [
                  envelopeWhereInput,
                  getOrganisationTemplateWhereInput({
                    id: sourceId,
                    organisationId: team.organisationId,
                    teamRole: team.currentTeamRole,
                  }),
                ],
              },
            ],
          },
        },
      },
    });
    if (!source) {
      throw unavailable();
    }
    return source;
  }

  const receipt = await prisma.bizrethinkPdfUpload.findUnique({ where: { documentDataId: id } });
  const isTeamAllowed =
    receipt &&
    (apiScope.teamId === undefined
      ? receipt.teamId === null || receipt.teamId === teamId
      : receipt.teamId === apiScope.teamId);
  if (!receipt || receipt.userId !== userId || !isTeamAllowed) {
    throw unavailable();
  }
  // A receipt cannot bypass a new envelope attachment or authorize changed
  // data after an old attachment was deleted. Unowned legacy orphans fail closed.
  const source = await prisma.documentData.findFirst({ where: { id, envelopeItem: null } });
  if (!source || fingerprint(source) !== receipt.fingerprint) {
    throw unavailable();
  }
  return source;
};
