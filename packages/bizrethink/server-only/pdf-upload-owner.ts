import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { verifyEmbeddingPresignToken } from '@documenso/lib/server-only/embedding-presign/verify-embedding-presign-token';
import type { Context } from 'hono';

import type { PdfUploadOwner } from './template-pdf-sources';

/** Preserve the upload endpoint's session/presign authentication and its team. */
export const resolvePdfUploadOwner = async (c: Context): Promise<PdfUploadOwner | null> => {
  const session = await getOptionalSession(c);
  if (session.user?.id) {
    return { userId: session.user.id, teamId: null };
  }
  const [bearer] = (c.req.header('authorization') || '').split('Bearer ').filter(Boolean);
  const token = bearer || c.req.query('token');
  if (!token) {
    return null;
  }
  const verified = await verifyEmbeddingPresignToken({ token }).catch(() => undefined);
  if (!verified?.teamId) {
    return null;
  }
  return { userId: verified.userId, teamId: verified.teamId };
};
