// MODIFIED for BizRethink (overlay 090): redact server diagnostics before transport.
import { createServerConsole } from '@bizrethink/customizations/server-only/logging/server-console';
import { AppError } from '@documenso/lib/errors/app-error';
import { Hono } from 'hono';

// MODIFIED for BizRethink (overlay 014): use async getters.
import { getGoogleAuthOptions, getMicrosoftAuthOptions, getOidcAuthOptions } from '../config';
import { handleOAuthCallbackUrl } from '../lib/utils/handle-oauth-callback-url';
import { handleOAuthOrganisationCallbackUrl } from '../lib/utils/handle-oauth-organisation-callback-url';
import type { HonoAuthContext } from '../types/context';

const serverConsole = createServerConsole('packages/auth/server/routes/callback');

/**
 * Have to create this route instead of bundling callback with oauth routes to provide
 * backwards compatibility for self-hosters (since we used to use NextAuth).
 */
export const callbackRoute = new Hono<HonoAuthContext>()
  /**
   * OIDC callback verification.
   */
  .get('/oidc', async (c) => handleOAuthCallbackUrl({ c, clientOptions: await getOidcAuthOptions() }))

  /**
   * Organisation OIDC callback verification.
   */
  .get('/oidc/org/:orgUrl', async (c) => {
    const orgUrl = c.req.param('orgUrl');

    try {
      return await handleOAuthOrganisationCallbackUrl({
        c,
        orgUrl,
      });
    } catch (err) {
      serverConsole.error(err);

      if (err instanceof Error) {
        throw new AppError(err.name, {
          message: err.message,
          statusCode: 500,
        });
      }

      throw err;
    }
  })

  /**
   * Google callback verification.
   */
  .get('/google', async (c) => handleOAuthCallbackUrl({ c, clientOptions: await getGoogleAuthOptions() }))

  /**
   * Microsoft callback verification.
   */
  .get('/microsoft', async (c) => handleOAuthCallbackUrl({ c, clientOptions: await getMicrosoftAuthOptions() }));
