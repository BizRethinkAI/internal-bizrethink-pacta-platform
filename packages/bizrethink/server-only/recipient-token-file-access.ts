import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { MiddlewareHandler } from 'hono';

import { assertRecipientTokenAccess } from './recipient-access';

/** Mounted before every /api/files/token/:token/* recipient PDF adapter. */
export const recipientTokenFileAccess: MiddlewareHandler = async (c, next) => {
  const token = c.req.param('token');
  // QR links are a separate public capability, not recipient credentials.
  if (token?.startsWith('qr_')) {
    return await next();
  }
  c.header('Cache-Control', 'private, no-store, max-age=0');
  try {
    const { user } = await getOptionalSession(c);
    await assertRecipientTokenAccess({ token: token ?? '', userId: user?.id });
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === AppErrorCode.UNAUTHORIZED || error.code === AppErrorCode.NOT_FOUND)
    ) {
      return c.json({ error: 'Not found' }, 404);
    }
    throw error;
  }
  try {
    await next();
  } finally {
    // Legacy renderers overwrite cache headers. Override after rendering too,
    // so a protected response is never reusable without a fresh identity check.
    c.header('Cache-Control', 'private, no-store, max-age=0');
  }
};
