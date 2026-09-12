import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import type { Context, MiddlewareHandler } from 'hono';

import { getPresignEnvelopeWhere, verifyPresignCapability } from './presign-capability';

/** Explicit token input takes precedence over cookies, as in the existing adapters. */
export const resolvePresignFileActor = async (c: Context, parameter: 'token' | 'presignToken') => {
  const token = c.req.query(parameter);
  const { user } = await getOptionalSession(c);
  if (!token) {
    return user ? { userId: user.id, envelopeWhere: {} } : null;
  }
  try {
    const capability = await verifyPresignCapability({ token });
    return { userId: capability.userId, envelopeWhere: getPresignEnvelopeWhere(capability) };
  } catch {
    return null;
  }
};

/** Each adapter names its actual credential parameter; human-session reads keep their existing policy. */
export const presignFileCache =
  (parameter: 'token' | 'presignToken'): MiddlewareHandler =>
  async (c, next) => {
    const token = c.req.query(parameter);
    if (!token) {
      return await next();
    }
    c.header('Cache-Control', 'private, no-store, max-age=0');
    try {
      await next();
    } finally {
      // A cached PDF must not outlive the delegated capability or its parent key.
      c.header('Cache-Control', 'private, no-store, max-age=0');
    }
  };
