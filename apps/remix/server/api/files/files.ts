import { resolvePdfUploadOwner } from '@bizrethink/customizations/server-only/pdf-upload-owner';
import { presignFileCache, resolvePresignFileActor } from '@bizrethink/customizations/server-only/presign-file-access';
import { recipientTokenFileAccess } from '@bizrethink/customizations/server-only/recipient-token-file-access';
import { recordPdfUpload } from '@bizrethink/customizations/server-only/template-pdf-sources';
import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { APP_DOCUMENT_UPLOAD_SIZE_LIMIT } from '@documenso/lib/constants/app';
import { AppError } from '@documenso/lib/errors/app-error';
import { putNormalizedPdfFileServerSide } from '@documenso/lib/universal/upload/put-file.server';
import { prisma } from '@documenso/prisma';
import { sValidator } from '@hono/standard-validator';
import type { Prisma } from '@prisma/client';
import { Hono } from 'hono';

import type { HonoEnv } from '../../router';
import { checkEnvelopeFileAccess, handleEnvelopeItemFileRequest } from './files.helpers';
import {
  ZGetEnvelopeItemFileDownloadRequestParamsSchema,
  ZGetEnvelopeItemFileRequestParamsSchema,
  ZGetEnvelopeItemFileRequestQuerySchema,
  ZGetEnvelopeItemFileTokenDownloadRequestParamsSchema,
  ZGetEnvelopeItemFileTokenRequestParamsSchema,
  ZUploadPdfRequestSchema,
} from './files.types';
import getEnvelopeItemPdfRoute from './routes/get-envelope-item-pdf';
import getEnvelopeItemPdfByTokenRoute from './routes/get-envelope-item-pdf-by-token';

export const filesRoute = new Hono<HonoEnv>()
  // MODIFIED for BizRethink (overlay 078): delegated PDFs must revalidate on future reads.
  .use('/envelope/:envelopeId/envelopeItem/:envelopeItemId', presignFileCache('token'))
  .use(
    '/envelope/:envelopeId/envelopeItem/:envelopeItemId/dataId/:documentDataId/:version/item.pdf',
    presignFileCache('presignToken'),
  )
  // MODIFIED for BizRethink (overlay 076): covers all three token PDF adapters, including nested routes.
  .use('/token/:token/*', recipientTokenFileAccess)
  /**
   * Uploads a document file to the appropriate storage location and creates
   * a document data record.
   */
  .post('/upload-pdf', sValidator('form', ZUploadPdfRequestSchema), async (c) => {
    try {
      // MODIFIED for BizRethink (overlay 077): retain verified ownership for staged PDF replacements.
      const owner = await resolvePdfUploadOwner(c);

      if (!owner) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { file } = c.req.valid('form');

      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }

      // Todo: (RR7) This is new.
      // Add file size validation.
      // Convert MB to bytes (1 MB = 1024 * 1024 bytes)
      const MAX_FILE_SIZE = APP_DOCUMENT_UPLOAD_SIZE_LIMIT * 1024 * 1024;

      if (file.size > MAX_FILE_SIZE) {
        return c.json({ error: 'File too large' }, 400);
      }

      const result = await putNormalizedPdfFileServerSide(file);
      await recordPdfUpload(result, owner);

      return c.json(result);
    } catch (error) {
      console.error('Upload failed:', error);
      return c.json({ error: 'Upload failed' }, 500);
    }
  })
  .get(
    '/envelope/:envelopeId/envelopeItem/:envelopeItemId',
    sValidator('param', ZGetEnvelopeItemFileRequestParamsSchema),
    sValidator('query', ZGetEnvelopeItemFileRequestQuerySchema),
    async (c) => {
      const { envelopeId, envelopeItemId } = c.req.valid('param');
      // MODIFIED for BizRethink (overlay 078): keep the verified capability on the data-bearing query.
      const actor = await resolvePresignFileActor(c, 'token');
      const userId = actor?.userId;

      if (!userId) {
        const hasPresign = Boolean(c.req.query('token'));
        return c.json({ error: hasPresign ? 'Not found' : 'Unauthorized' }, hasPresign ? 404 : 401);
      }

      const envelope = await prisma.envelope.findFirst({
        where: {
          id: envelopeId,
          ...actor?.envelopeWhere,
        },
        include: {
          envelopeItems: {
            where: {
              id: envelopeItemId,
            },
            include: {
              documentData: true,
            },
          },
        },
      });

      if (!envelope) {
        return c.json({ error: 'Envelope not found' }, 404);
      }

      const [envelopeItem] = envelope.envelopeItems;

      if (!envelopeItem) {
        return c.json({ error: 'Envelope item not found' }, 404);
      }

      const hasAccess = await checkEnvelopeFileAccess({
        userId,
        teamId: envelope.teamId,
        envelopeType: envelope.type,
        templateType: envelope.templateType,
      });

      if (!hasAccess) {
        return c.json({ error: 'User does not have access to the team that this envelope is associated with' }, 403);
      }

      if (!envelopeItem.documentData) {
        return c.json({ error: 'Document data not found' }, 404);
      }

      return await handleEnvelopeItemFileRequest({
        title: envelopeItem.title,
        status: envelope.status,
        documentData: envelopeItem.documentData,
        version: 'signed',
        isDownload: false,
        context: c,
      });
    },
  )
  .get(
    '/envelope/:envelopeId/envelopeItem/:envelopeItemId/download/:version?',
    sValidator('param', ZGetEnvelopeItemFileDownloadRequestParamsSchema),
    async (c) => {
      const logger = c.get('logger');

      try {
        const { envelopeId, envelopeItemId, version } = c.req.valid('param');

        const session = await getOptionalSession(c);

        if (!session.user) {
          return c.json({ error: 'Unauthorized' }, 401);
        }

        const envelope = await prisma.envelope.findFirst({
          where: {
            id: envelopeId,
          },
          include: {
            envelopeItems: {
              where: {
                id: envelopeItemId,
              },
              include: {
                documentData: true,
              },
            },
            recipients: {
              select: {
                role: true,
                signingStatus: true,
              },
            },
          },
        });

        if (!envelope) {
          return c.json({ error: 'Envelope not found' }, 404);
        }

        const [envelopeItem] = envelope.envelopeItems;

        if (!envelopeItem) {
          return c.json({ error: 'Envelope item not found' }, 404);
        }

        const hasDownloadAccess = await checkEnvelopeFileAccess({
          userId: session.user.id,
          teamId: envelope.teamId,
          envelopeType: envelope.type,
          templateType: envelope.templateType,
        });

        if (!hasDownloadAccess) {
          return c.json(
            {
              error: 'User does not have access to the team that this envelope is associated with',
            },
            403,
          );
        }

        if (!envelopeItem.documentData) {
          return c.json({ error: 'Document data not found' }, 404);
        }

        const baseOptions = {
          title: envelopeItem.title,
          documentData: envelopeItem.documentData,
          isDownload: true,
          context: c,
        } as const;

        if (version === 'pending') {
          return await handleEnvelopeItemFileRequest({
            ...baseOptions,
            version,
            envelopeItemId: envelopeItem.id,
            envelope,
          });
        }

        return await handleEnvelopeItemFileRequest({
          ...baseOptions,
          version,
          status: envelope.status,
        });
      } catch (error) {
        logger.error(error);

        if (error instanceof AppError) {
          const { status, body } = AppError.toRestAPIError(error);

          return c.json({ error: body.message, code: error.code }, status);
        }

        return c.json({ error: 'Internal server error' }, 500);
      }
    },
  )
  .get(
    '/token/:token/envelopeItem/:envelopeItemId',
    sValidator('param', ZGetEnvelopeItemFileTokenRequestParamsSchema),
    async (c) => {
      const { token, envelopeItemId } = c.req.valid('param');

      let envelopeWhereQuery: Prisma.EnvelopeItemWhereUniqueInput = {
        id: envelopeItemId,
        envelope: {
          recipients: {
            some: {
              token,
            },
          },
        },
      };

      if (token.startsWith('qr_')) {
        envelopeWhereQuery = {
          id: envelopeItemId,
          envelope: {
            qrToken: token,
          },
        };
      }

      const envelopeItem = await prisma.envelopeItem.findUnique({
        where: envelopeWhereQuery,
        include: {
          envelope: true,
          documentData: true,
        },
      });

      if (!envelopeItem) {
        return c.json({ error: 'Envelope item not found' }, 404);
      }

      if (!envelopeItem.documentData) {
        return c.json({ error: 'Document data not found' }, 404);
      }

      return await handleEnvelopeItemFileRequest({
        title: envelopeItem.title,
        status: envelopeItem.envelope.status,
        documentData: envelopeItem.documentData,
        version: 'signed',
        isDownload: false,
        context: c,
      });
    },
  )
  .get(
    '/token/:token/envelopeItem/:envelopeItemId/download/:version?',
    sValidator('param', ZGetEnvelopeItemFileTokenDownloadRequestParamsSchema),
    async (c) => {
      const { token, envelopeItemId, version } = c.req.valid('param');

      let envelopeWhereQuery: Prisma.EnvelopeItemWhereUniqueInput = {
        id: envelopeItemId,
        envelope: {
          recipients: {
            some: {
              token,
            },
          },
        },
      };

      if (token.startsWith('qr_')) {
        envelopeWhereQuery = {
          id: envelopeItemId,
          envelope: {
            qrToken: token,
          },
        };
      }

      const envelopeItem = await prisma.envelopeItem.findUnique({
        where: envelopeWhereQuery,
        include: {
          envelope: true,
          documentData: true,
        },
      });

      if (!envelopeItem) {
        return c.json({ error: 'Envelope item not found' }, 404);
      }

      if (!envelopeItem.documentData) {
        return c.json({ error: 'Document data not found' }, 404);
      }

      return await handleEnvelopeItemFileRequest({
        title: envelopeItem.title,
        status: envelopeItem.envelope.status,
        documentData: envelopeItem.documentData,
        version,
        isDownload: true,
        context: c,
      });
    },
  );

// PDF routes for both tokens and auth based
// Is different to the other file endpoints since it uses documentDataId for hard caching.
filesRoute.route('/', getEnvelopeItemPdfRoute);
filesRoute.route('/', getEnvelopeItemPdfByTokenRoute);
